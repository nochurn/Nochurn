-- ==============================================================================
-- NoChurn Production PostgreSQL Migration: Complete Workspace-Isolated Persistence
-- Migration: 20260924000001_complete_nochurn_persistence.sql
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Workspaces Table
CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Users Table (Stores authenticated founders, team members, and admins)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    company_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    phone TEXT,
    email_verified BOOLEAN DEFAULT true NOT NULL,
    selected_plan TEXT DEFAULT 'growth' NOT NULL,
    billing_status TEXT DEFAULT 'pending_payment' NOT NULL,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
    role TEXT DEFAULT 'Admin' NOT NULL,
    razorpay_subscription_id TEXT,
    razorpay_plan_id TEXT,
    billing_plan_id TEXT,
    trial_ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Active Sessions Table (Cookie-session auth persisting across restarts & devices)
CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    expires_at BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- 5. Password Reset Tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    expires_at BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6. Workspace Members Table (Multi-tenant RBAC)
CREATE TABLE IF NOT EXISTS workspace_members (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_workspace_member UNIQUE (workspace_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);

-- 7. Pending Signups & Trial Verification Tracking
CREATE TABLE IF NOT EXISTS pending_signups (
    user_id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    tier TEXT NOT NULL CHECK (tier IN ('starter', 'growth', 'pro')),
    billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
    trial_verified BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 8. Authoritative Billing Plans
CREATE TABLE IF NOT EXISTS billing_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tier TEXT NOT NULL CHECK (tier IN ('starter', 'growth', 'pro')),
    billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
    amount_paise BIGINT NOT NULL,
    amount_inr NUMERIC(12, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    razorpay_plan_id TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 9. Customers Table (Workspace-isolated customer telemetry, risk scores & AI recommendations)
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL,
    name TEXT NOT NULL,
    domain TEXT,
    plan TEXT NOT NULL,
    mrr NUMERIC(12, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    risk_score INTEGER NOT NULL,
    risk_category TEXT NOT NULL,
    last_login_days INTEGER NOT NULL DEFAULT 0,
    usage_drop_percent INTEGER NOT NULL DEFAULT 0,
    open_tickets_count INTEGER NOT NULL DEFAULT 0,
    payment_status TEXT NOT NULL DEFAULT 'paid',
    contract_renewal_days INTEGER NOT NULL DEFAULT 90,
    primary_contact_name TEXT,
    primary_contact_role TEXT,
    primary_contact_email TEXT,
    data_json JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_workspace_customer UNIQUE (workspace_id, customer_id)
);
CREATE INDEX IF NOT EXISTS idx_customers_workspace_id ON customers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_customers_risk_score ON customers(workspace_id, risk_score);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(workspace_id, status);

-- 10. CSV & Ingestion Imports
CREATE TABLE IF NOT EXISTS csv_imports (
    import_id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    source TEXT NOT NULL DEFAULT 'CSV',
    file_name TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    total_rows INTEGER NOT NULL DEFAULT 0,
    valid_rows INTEGER NOT NULL DEFAULT 0,
    failed_rows INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'completed',
    error_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_csv_imports_workspace_id ON csv_imports(workspace_id);

-- 11. Retention Actions & Playbooks
CREATE TABLE IF NOT EXISTS retention_actions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    recommended_action TEXT,
    email_script TEXT,
    recovery_probability INTEGER,
    discount_offered TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_retention_actions_workspace ON retention_actions(workspace_id);

-- 12. Trial Verifications Table (₹1 Razorpay Verification Orders)
CREATE TABLE IF NOT EXISTS trial_verifications (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    email TEXT NOT NULL,
    tier TEXT NOT NULL CHECK (tier IN ('starter', 'growth', 'pro')),
    billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
    billing_plan_id TEXT NOT NULL REFERENCES billing_plans(id),
    razorpay_plan_id TEXT NOT NULL,
    razorpay_order_id TEXT NOT NULL UNIQUE,
    amount_paise INTEGER NOT NULL DEFAULT 100,
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed')),
    payment_id TEXT,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_trial_verifications_workspace_id ON trial_verifications(workspace_id);
CREATE INDEX IF NOT EXISTS idx_trial_verifications_order_id ON trial_verifications(razorpay_order_id);

-- 13. Subscriptions Table (Workspace Subscription & Trial Lifecycle)
CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    workspace_id TEXT NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    email TEXT NOT NULL,
    tier TEXT NOT NULL CHECK (tier IN ('starter', 'growth', 'pro')),
    billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
    billing_plan_id TEXT NOT NULL REFERENCES billing_plans(id),
    razorpay_plan_id TEXT NOT NULL,
    razorpay_subscription_id TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'trialing', 'active', 'halted', 'cancelled', 'past_due', 'trial_expired')),
    trial_started_at TIMESTAMPTZ,
    trial_ends_at TIMESTAMPTZ,
    payment_verification_status TEXT NOT NULL CHECK (payment_verification_status IN ('pending', 'verified', 'failed')),
    razorpay_verification_order_id TEXT,
    razorpay_verification_payment_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace_id ON subscriptions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- 14. Razorpay Orders
CREATE TABLE IF NOT EXISTS razorpay_orders (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    order_id TEXT NOT NULL UNIQUE,
    amount_paise BIGINT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    receipt TEXT,
    status TEXT NOT NULL,
    metadata_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_razorpay_orders_order_id ON razorpay_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_razorpay_orders_workspace_id ON razorpay_orders(workspace_id);

-- 15. Webhook Events Table (Strict Idempotency to Prevent Duplicate Processing)
CREATE TABLE IF NOT EXISTS webhook_events (
    event_id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    workspace_id TEXT,
    idempotency_key TEXT NOT NULL UNIQUE,
    payload_json JSONB NOT NULL,
    processed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    status TEXT NOT NULL DEFAULT 'processed'
);
CREATE INDEX IF NOT EXISTS idx_webhook_events_idempotency ON webhook_events(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_webhook_events_type ON webhook_events(event_type);
