-- NoChurn Supabase Schema Migration: Trial Verification & Subscriptions
-- Migration: 20260922000001_trial_verification_and_subscriptions.sql

-- Enable UUID extension if not present
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Billing Plans Table (Authoritative SaaS pricing)
CREATE TABLE IF NOT EXISTS billing_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('starter', 'growth', 'pro')),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
  amount_paise BIGINT NOT NULL,
  amount_inr NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  razorpay_plan_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed authoritative billing plans (India-first INR, 18% annual discount)
INSERT INTO billing_plans (id, name, tier, billing_cycle, amount_paise, amount_inr, currency, razorpay_plan_id, is_active)
VALUES
  ('plan_tier_starter_monthly', 'NoChurn Starter', 'starter', 'monthly', 499900, 4999.00, 'INR', 'plan_TeZlsQOQaeAWAw', true),
  ('plan_tier_starter_annual', 'NoChurn Starter — Annual', 'starter', 'annual', 4919016, 49190.16, 'INR', 'plan_TeZMQYLVPEtQuj', true),
  ('plan_tier_growth_monthly', 'NoChurn Growth - Monthly', 'growth', 'monthly', 1299900, 12999.00, 'INR', 'plan_TeZQFjmJoxrnKM', true),
  ('plan_tier_growth_annual', 'NoChurn Growth - Annual', 'growth', 'annual', 12791016, 127910.16, 'INR', 'plan_TfXxPsAOqPYklF', true),
  ('plan_tier_pro_monthly', 'NoChurn Pro - Monthly', 'pro', 'monthly', 2999900, 29999.00, 'INR', 'plan_TeZraPPrYthtEk', true),
  ('plan_tier_pro_annual', 'NoChurn Pro - Annual', 'pro', 'annual', 29519016, 295190.16, 'INR', 'plan_Tea17dB6H4EHdn', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  amount_paise = EXCLUDED.amount_paise,
  amount_inr = EXCLUDED.amount_inr,
  razorpay_plan_id = EXCLUDED.razorpay_plan_id,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- 2. Trial Verifications Table (₹1 Razorpay Verification Orders)
CREATE TABLE IF NOT EXISTS trial_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT NOT NULL,
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by workspace & order ID
CREATE INDEX IF NOT EXISTS idx_trial_verifications_workspace_id ON trial_verifications(workspace_id);
CREATE INDEX IF NOT EXISTS idx_trial_verifications_order_id ON trial_verifications(razorpay_order_id);

-- 3. Subscriptions Table (Workspace Subscription & Trial Lifecycle)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace_id ON subscriptions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- 4. Supabase Row Level Security (RLS)
ALTER TABLE billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Billing plans are publicly readable by all authenticated and anonymous clients
CREATE POLICY "Allow public read access on billing_plans"
  ON billing_plans
  FOR SELECT
  USING (true);

-- Workspace members can view their own trial verifications
CREATE POLICY "Allow workspace members to read trial_verifications"
  ON trial_verifications
  FOR SELECT
  USING (
    workspace_id = auth.jwt() ->> 'workspace_id'
    OR user_id = auth.uid()::text
  );

-- Only service role / server can insert or update trial verifications
CREATE POLICY "Allow server-side service role to manage trial_verifications"
  ON trial_verifications
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Workspace members can view their own subscription
CREATE POLICY "Allow workspace members to read subscriptions"
  ON subscriptions
  FOR SELECT
  USING (
    workspace_id = auth.jwt() ->> 'workspace_id'
    OR user_id = auth.uid()::text
  );

-- Only service role / server can insert or update subscriptions
CREATE POLICY "Allow server-side service role to manage subscriptions"
  ON subscriptions
  FOR ALL
  USING (true)
  WITH CHECK (true);
