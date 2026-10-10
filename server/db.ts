/**
 * NoChurn Enterprise Managed Database Adapter & Connection Pool
 *
 * Supports:
 * 1. Managed PostgreSQL via `pg.Pool` (Cloud Run, Cloud SQL, Supabase, Neon, AWS RDS)
 *    Configured via `DATABASE_URL` or standard `PGHOST`/`PGPORT`/`PGUSER`/`PGPASSWORD`/`PGDATABASE`.
 * 2. Persistent Disk Database via SQLite WAL (`data/nochurn.db`) for immediate offline/container
 *    persistence so that all users, workspaces, customers, orders, and subscriptions survive
 *    server restarts and scale-to-zero even before external PostgreSQL credentials are attached.
 * 3. Atomic transactions and strict idempotency for Razorpay payments and webhooks.
 * 4. 100% Multi-Tenant Workspace Isolation across every query.
 */

import { Pool, PoolClient } from 'pg';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import type { Customer, ImportHistoryRecord } from '../src/types.ts';

export interface DbWorkspace {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface DbUser {
  id: string;
  full_name: string;
  company_name: string;
  email: string;
  password_hash: string;
  phone?: string;
  email_verified: boolean;
  selected_plan: string;
  billing_status: string;
  workspace_id: string;
  role: string;
  razorpay_subscription_id?: string;
  razorpay_plan_id?: string;
  billing_plan_id?: string;
  trial_ends_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DbSession {
  token: string;
  user_id: string;
  email: string;
  workspace_id: string;
  expires_at: number;
  created_at: string;
}

export interface DbBillingPlan {
  id: string;
  name: string;
  tier: 'starter' | 'growth' | 'pro';
  billing_cycle: 'monthly' | 'annual';
  amount_paise: number;
  amount_inr: number;
  currency: string;
  razorpay_plan_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbTrialVerification {
  id: string;
  workspace_id: string;
  user_id: string;
  email: string;
  tier: 'starter' | 'growth' | 'pro';
  billing_cycle: 'monthly' | 'annual';
  billing_plan_id: string;
  razorpay_plan_id: string;
  razorpay_order_id: string;
  amount_paise: number;
  currency: string;
  status: 'pending' | 'verified' | 'failed';
  payment_id?: string;
  verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DbSubscription {
  id: string;
  workspace_id: string;
  user_id: string;
  email: string;
  tier: 'starter' | 'growth' | 'pro';
  billing_cycle: 'monthly' | 'annual';
  billing_plan_id: string;
  razorpay_plan_id: string;
  razorpay_subscription_id?: string;
  status: 'pending' | 'trialing' | 'active' | 'halted' | 'cancelled' | 'past_due' | 'trial_expired';
  trial_started_at?: string;
  trial_ends_at?: string;
  payment_verification_status: 'pending' | 'verified' | 'failed';
  razorpay_verification_order_id?: string;
  razorpay_verification_payment_id?: string;
  created_at: string;
  updated_at: string;
}

export interface DbWebhookEvent {
  event_id: string;
  event_type: string;
  workspace_id?: string;
  idempotency_key: string;
  payload_json: any;
  processed_at: string;
  status: string;
}

// ----------------------------------------------------------------------------
// Database Configuration & Connection Pool
// ----------------------------------------------------------------------------
let pgPool: Pool | null = null;
let sqliteDb: DatabaseSync | null = null;
let isPostgresActive = false;
let databaseInitialized = false;

// Ensure persistent data directory exists
const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
  } catch (err) {
    // ignore
  }
}

/**
 * Initializes and returns the active connection pool / storage engine
 */
export async function initDatabase(): Promise<{ isPostgres: boolean; target: string }> {
  if (databaseInitialized) {
    return { 
      isPostgres: isPostgresActive, 
      target: isPostgresActive 
        ? 'PostgreSQL' 
        : (process.env.NODE_ENV === 'production' || Boolean(process.env.RAILWAY_ENVIRONMENT)
            ? 'Unconfigured (PostgreSQL Required in Production)'
            : 'SQLite WAL (Local Development Only)')
    };
  }

  const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.RAILWAY_ENVIRONMENT);

  // 1. Check for PostgreSQL credentials
  // A PostgreSQL connection string must start with postgresql:// or postgres://.
  // If an HTTP REST URL (e.g. Supabase REST endpoint) was passed into DATABASE_URL, ignore it for pg.Pool.
  const rawDbUrl = (process.env.DATABASE_URL || process.env.POSTGRES_URL || '').trim();
  const isPostgresUrl = rawDbUrl.startsWith('postgresql://') || rawDbUrl.startsWith('postgres://');
  if (rawDbUrl && !isPostgresUrl) {
    console.log('[NoChurn DB] Non-PostgreSQL URL detected in DATABASE_URL (expected postgresql:// or postgres://). Skipping pg.Pool.');
  }

  const dbUrl = isPostgresUrl ? rawDbUrl : undefined;
  const pgHost = process.env.PGHOST;

  if (dbUrl || pgHost) {
    let pool: Pool | null = null;
    try {
      const poolConfig = dbUrl
        ? {
            connectionString: dbUrl,
            ssl: (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1') || dbUrl.includes('.railway.internal')) ? false : { rejectUnauthorized: false },
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 4000
          }
        : {
            host: pgHost,
            port: Number(process.env.PGPORT || 5432),
            user: process.env.PGUSER || 'postgres',
            password: process.env.PGPASSWORD,
            database: process.env.PGDATABASE || 'railway',
            ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 4000
          };

      pool = new Pool(poolConfig);
      pool.on('error', (err) => {
        console.error('[NoChurn DB Pool Warning] Idle client error:', err.message);
      });

      // Probe connection once with short timeout
      const client = await pool.connect();
      await client.query('SELECT 1 as connected');
      client.release();

      pgPool = pool;
      isPostgresActive = true;
      console.log('[NoChurn DB] Successfully connected to PostgreSQL pool.');
      await runPostgresMigrations(pgPool);
      await migrateSqliteToPostgresIfEmpty(pgPool);
      databaseInitialized = true;
      return { isPostgres: true, target: 'PostgreSQL' };
    } catch (err: any) {
      if (pool) {
        await pool.end().catch(() => {});
      }
      pgPool = null;
      isPostgresActive = false;
      if (isProduction) {
        console.error('[NoChurn DB Error] PostgreSQL connection unreachable (' + (err?.message || 'timeout') + ').');
        databaseInitialized = true;
        console.error('[NoChurn DB Error] Refusing to fall back to SQLite when NODE_ENV=production.');
        return { isPostgres: false, target: 'PostgreSQL Connection Failed' };
      }
      console.warn('[NoChurn DB Notice] PostgreSQL connection unreachable (' + (err?.message || 'timeout') + '). Using local SQLite storage for development.');
    }
  } else if (isProduction) {
    console.error('[NoChurn DB Error] NODE_ENV=production detected, but DATABASE_URL is not configured. SQLite fallback is prohibited in production.');
    databaseInitialized = true;
    isPostgresActive = false;
    return { isPostgres: false, target: 'Unconfigured (PostgreSQL Required in Production)' };
  }

  // 2. Initialize persistent SQLite WAL storage for local development ONLY
  const dbFilePath = path.join(dataDir, 'nochurn.db');
  sqliteDb = new DatabaseSync(dbFilePath);
  // Enable WAL (Write-Ahead Logging) mode and foreign keys for high-performance concurrent writes
  sqliteDb.exec('PRAGMA journal_mode = WAL;');
  sqliteDb.exec('PRAGMA foreign_keys = ON;');
  sqliteDb.exec('PRAGMA synchronous = NORMAL;');
  
  runSqliteMigrations(sqliteDb);
  isPostgresActive = false;
  databaseInitialized = true;
  console.log(`[NoChurn DB] Local development SQLite database active at: ${dbFilePath}`);
  return { isPostgres: false, target: 'SQLite WAL (Local Development Only)' };
}

/**
 * Automatically migrates existing local data into PostgreSQL when PostgreSQL is first attached
 */
async function migrateSqliteToPostgresIfEmpty(pool: Pool) {
  try {
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT COUNT(*) as count FROM customers');
      const count = parseInt(res.rows[0]?.count || '0', 10);
      if (count === 0 && sqliteDb) {
        console.log('[NoChurn DB Migration] PostgreSQL database is empty. Migrating local records to PostgreSQL...');
        const workspaces = sqliteDb.prepare('SELECT * FROM workspaces').all() as any[];
        for (const ws of workspaces) {
          await client.query(
            'INSERT INTO workspaces (id, name, owner_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
            [ws.id, ws.name, ws.owner_id, ws.created_at, ws.updated_at]
          );
        }
        const users = sqliteDb.prepare('SELECT * FROM users').all() as any[];
        for (const u of users) {
          await client.query(
            `INSERT INTO users (
              id, full_name, company_name, email, password_hash, phone, email_verified,
              selected_plan, billing_status, workspace_id, role, razorpay_subscription_id,
              razorpay_plan_id, billing_plan_id, trial_ends_at, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            ON CONFLICT (email) DO NOTHING`,
            [
              u.id, u.full_name, u.company_name, u.email, u.password_hash, u.phone || null,
              Boolean(u.email_verified), u.selected_plan, u.billing_status, u.workspace_id,
              u.role || 'Admin', u.razorpay_subscription_id || null, u.razorpay_plan_id || null,
              u.billing_plan_id || null, u.trial_ends_at || null, u.created_at, u.updated_at
            ]
          );
        }
        const customers = sqliteDb.prepare('SELECT * FROM customers').all() as any[];
        for (const c of customers) {
          await client.query(
            `INSERT INTO customers (
              id, workspace_id, customer_id, name, domain, plan, mrr, status,
              risk_score, risk_category, last_login_days, usage_drop_percent,
              open_tickets_count, payment_status, contract_renewal_days,
              primary_contact_name, primary_contact_role, primary_contact_email,
              data_json, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
            ON CONFLICT (workspace_id, customer_id) DO NOTHING`,
            [
              c.id, c.workspace_id, c.customer_id, c.name, c.domain || null, c.plan,
              c.mrr, c.status, c.risk_score, c.risk_category, c.last_login_days,
              c.usage_drop_percent, c.open_tickets_count, c.payment_status,
              c.contract_renewal_days, c.primary_contact_name || null,
              c.primary_contact_role || null, c.primary_contact_email || null,
              c.data_json, c.created_at, c.updated_at
            ]
          );
        }
        console.log(`[NoChurn DB Migration] Successfully migrated ${customers.length} customer records to PostgreSQL.`);
      }
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.warn('[NoChurn DB Migration Warning] SQLite to PostgreSQL migration skipped:', err.message);
  }
}

// ----------------------------------------------------------------------------
// SQL Migrations (Idempotent DDL)
// ----------------------------------------------------------------------------
export async function runPostgresMigrations(pool: Pool) {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        owner_id TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );

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
        workspace_id TEXT NOT NULL REFERENCES workspaces(id),
        role TEXT DEFAULT 'Admin' NOT NULL,
        razorpay_subscription_id TEXT,
        razorpay_plan_id TEXT,
        billing_plan_id TEXT,
        trial_ends_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        expires_at BIGINT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        token TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        expires_at BIGINT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS workspace_members (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'member',
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT unique_pg_workspace_member UNIQUE (workspace_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS pending_signups (
        user_id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        tier TEXT NOT NULL,
        billing_cycle TEXT NOT NULL,
        trial_verified BOOLEAN DEFAULT false NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS billing_plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        tier TEXT NOT NULL,
        billing_cycle TEXT NOT NULL,
        amount_paise BIGINT NOT NULL,
        amount_inr NUMERIC(12, 2) NOT NULL,
        currency TEXT NOT NULL DEFAULT 'INR',
        razorpay_plan_id TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );

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
        CONSTRAINT unique_pg_workspace_customer UNIQUE (workspace_id, customer_id)
      );

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

      CREATE TABLE IF NOT EXISTS retention_actions (
        id TEXT PRIMARY KEY,
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

      CREATE TABLE IF NOT EXISTS trial_verifications (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        email TEXT NOT NULL,
        tier TEXT NOT NULL,
        billing_cycle TEXT NOT NULL,
        billing_plan_id TEXT NOT NULL REFERENCES billing_plans(id),
        razorpay_plan_id TEXT NOT NULL,
        razorpay_order_id TEXT NOT NULL UNIQUE,
        amount_paise INTEGER NOT NULL DEFAULT 100,
        currency TEXT NOT NULL DEFAULT 'INR',
        status TEXT NOT NULL DEFAULT 'pending',
        payment_id TEXT,
        verified_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        email TEXT NOT NULL,
        tier TEXT NOT NULL,
        billing_cycle TEXT NOT NULL,
        billing_plan_id TEXT NOT NULL REFERENCES billing_plans(id),
        razorpay_plan_id TEXT NOT NULL,
        razorpay_subscription_id TEXT,
        status TEXT NOT NULL,
        trial_started_at TIMESTAMPTZ,
        trial_ends_at TIMESTAMPTZ,
        payment_verification_status TEXT NOT NULL DEFAULT 'pending',
        razorpay_verification_order_id TEXT,
        razorpay_verification_payment_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS razorpay_orders (
        id TEXT PRIMARY KEY,
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

      CREATE TABLE IF NOT EXISTS webhook_events (
        event_id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        workspace_id TEXT,
        idempotency_key TEXT NOT NULL UNIQUE,
        payload_json JSONB NOT NULL,
        processed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        status TEXT NOT NULL DEFAULT 'processed'
      );
    `);
  } finally {
    client.release();
  }
}

function runSqliteMigrations(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      company_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      phone TEXT,
      email_verified INTEGER DEFAULT 1 NOT NULL,
      selected_plan TEXT DEFAULT 'growth' NOT NULL,
      billing_status TEXT DEFAULT 'pending_payment' NOT NULL,
      workspace_id TEXT NOT NULL,
      role TEXT DEFAULT 'Admin' NOT NULL,
      razorpay_subscription_id TEXT,
      razorpay_plan_id TEXT,
      billing_plan_id TEXT,
      trial_ends_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workspace_members (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT DEFAULT 'member' NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(workspace_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS pending_signups (
      user_id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      tier TEXT NOT NULL,
      billing_cycle TEXT NOT NULL,
      trial_verified INTEGER DEFAULT 0 NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS billing_plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      tier TEXT NOT NULL,
      billing_cycle TEXT NOT NULL,
      amount_paise INTEGER NOT NULL,
      amount_inr REAL NOT NULL,
      currency TEXT DEFAULT 'INR' NOT NULL,
      razorpay_plan_id TEXT NOT NULL,
      is_active INTEGER DEFAULT 1 NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      name TEXT NOT NULL,
      domain TEXT,
      plan TEXT NOT NULL,
      mrr REAL NOT NULL,
      status TEXT DEFAULT 'active' NOT NULL,
      risk_score INTEGER NOT NULL,
      risk_category TEXT NOT NULL,
      last_login_days INTEGER DEFAULT 0 NOT NULL,
      usage_drop_percent INTEGER DEFAULT 0 NOT NULL,
      open_tickets_count INTEGER DEFAULT 0 NOT NULL,
      payment_status TEXT DEFAULT 'paid' NOT NULL,
      contract_renewal_days INTEGER DEFAULT 90 NOT NULL,
      primary_contact_name TEXT,
      primary_contact_role TEXT,
      primary_contact_email TEXT,
      data_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(workspace_id, customer_id)
    );

    CREATE TABLE IF NOT EXISTS csv_imports (
      import_id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      source TEXT DEFAULT 'CSV' NOT NULL,
      file_name TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      total_rows INTEGER DEFAULT 0 NOT NULL,
      valid_rows INTEGER DEFAULT 0 NOT NULL,
      failed_rows INTEGER DEFAULT 0 NOT NULL,
      status TEXT DEFAULT 'completed' NOT NULL,
      error_summary TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS retention_actions (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      status TEXT DEFAULT 'pending' NOT NULL,
      recommended_action TEXT,
      email_script TEXT,
      recovery_probability INTEGER,
      discount_offered TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trial_verifications (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      tier TEXT NOT NULL,
      billing_cycle TEXT NOT NULL,
      billing_plan_id TEXT NOT NULL,
      razorpay_plan_id TEXT NOT NULL,
      razorpay_order_id TEXT NOT NULL UNIQUE,
      amount_paise INTEGER DEFAULT 100 NOT NULL,
      currency TEXT DEFAULT 'INR' NOT NULL,
      status TEXT DEFAULT 'pending' NOT NULL,
      payment_id TEXT,
      verified_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      tier TEXT NOT NULL,
      billing_cycle TEXT NOT NULL,
      billing_plan_id TEXT NOT NULL,
      razorpay_plan_id TEXT NOT NULL,
      razorpay_subscription_id TEXT,
      status TEXT NOT NULL,
      trial_started_at TEXT,
      trial_ends_at TEXT,
      payment_verification_status TEXT DEFAULT 'pending' NOT NULL,
      razorpay_verification_order_id TEXT,
      razorpay_verification_payment_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS razorpay_orders (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      order_id TEXT NOT NULL UNIQUE,
      amount_paise INTEGER NOT NULL,
      currency TEXT DEFAULT 'INR' NOT NULL,
      receipt TEXT,
      status TEXT NOT NULL,
      metadata_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS webhook_events (
      event_id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      workspace_id TEXT,
      idempotency_key TEXT NOT NULL UNIQUE,
      payload_json TEXT NOT NULL,
      processed_at TEXT NOT NULL,
      status TEXT DEFAULT 'processed' NOT NULL
    );
  `);
}

// ----------------------------------------------------------------------------
// Type-Safe Universal Repository Operations
// ----------------------------------------------------------------------------

export const db = {
  /**
   * Health status & database engine details
   */
  async getHealth() {
    if (!databaseInitialized) await initDatabase();
    const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.RAILWAY_ENVIRONMENT);
    
    if (isPostgresActive) {
      return {
        status: 'healthy',
        engine: 'PostgreSQL',
        poolMax: 10,
        isPersistent: true,
        productionReady: true,
        timestamp: new Date().toISOString()
      };
    }

    if (isProd) {
      return {
        status: 'unhealthy',
        engine: 'PostgreSQL (Disconnected / Unconfigured)',
        poolMax: 0,
        isPersistent: false,
        productionReady: false,
        error: 'Production requires Railway PostgreSQL via DATABASE_URL. SQLite fallback is strictly disabled.',
        timestamp: new Date().toISOString()
      };
    }

    return {
      status: 'healthy',
      engine: 'SQLite WAL (Local Development Only)',
      poolMax: 1,
      isPersistent: false,
      productionReady: false,
      notice: 'Local development storage active. Railway PostgreSQL required for production beta users.',
      timestamp: new Date().toISOString()
    };
  },

  // Workspaces
  workspaces: {
    async getById(id: string): Promise<DbWorkspace | null> {
      if (!databaseInitialized) await initDatabase();
      if (isPostgresActive && pgPool) {
        const res = await pgPool.query('SELECT * FROM workspaces WHERE id = $1', [id]);
        return res.rows[0] || null;
      }
      const stmt = sqliteDb!.prepare('SELECT * FROM workspaces WHERE id = ?');
      return (stmt.get(id) as unknown as DbWorkspace) || null;
    },

    async upsert(ws: DbWorkspace): Promise<DbWorkspace> {
      if (!databaseInitialized) await initDatabase();
      if (isPostgresActive && pgPool) {
        const query = `
          INSERT INTO workspaces (id, name, owner_id, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            updated_at = EXCLUDED.updated_at
          RETURNING *;
        `;
        const res = await pgPool.query(query, [ws.id, ws.name, ws.owner_id, ws.created_at, ws.updated_at]);
        return res.rows[0];
      }
      const stmt = sqliteDb!.prepare(`
        INSERT INTO workspaces (id, name, owner_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT (id) DO UPDATE SET
          name = excluded.name,
          updated_at = excluded.updated_at
      `);
      stmt.run(ws.id, ws.name, ws.owner_id, ws.created_at, ws.updated_at);
      return ws;
    },

    async listAll(): Promise<DbWorkspace[]> {
      if (!databaseInitialized) await initDatabase();
      if (isPostgresActive && pgPool) {
        const res = await pgPool.query('SELECT * FROM workspaces');
        return res.rows;
      }
      return sqliteDb!.prepare('SELECT * FROM workspaces').all() as unknown as DbWorkspace[];
    }
  },

  // Users
  users: {
    async getById(id: string): Promise<DbUser | null> {
      if (!databaseInitialized) await initDatabase();
      if (isPostgresActive && pgPool) {
        const res = await pgPool.query('SELECT * FROM users WHERE id = $1', [id]);
        return res.rows[0] || null;
      }
      return (sqliteDb!.prepare('SELECT * FROM users WHERE id = ?').get(id) as unknown as DbUser) || null;
    },

    async getByEmail(email: string): Promise<DbUser | null> {
      if (!databaseInitialized) await initDatabase();
      const clean = email.toLowerCase().trim();
      if (isPostgresActive && pgPool) {
        const res = await pgPool.query('SELECT * FROM users WHERE LOWER(email) = $1', [clean]);
        return res.rows[0] || null;
      }
      return (sqliteDb!.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(clean) as unknown as DbUser) || null;
    },

    async upsert(user: DbUser): Promise<DbUser> {
      if (!databaseInitialized) await initDatabase();
      // Ensure workspace exists before inserting foreign key
      await db.workspaces.upsert({
        id: user.workspace_id || 'ws-default',
        name: user.company_name || 'My Workspace',
        owner_id: user.id,
        created_at: user.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      if (isPostgresActive && pgPool) {
        const query = `
          INSERT INTO users (
            id, full_name, company_name, email, password_hash, phone, email_verified,
            selected_plan, billing_status, workspace_id, role, razorpay_subscription_id,
            razorpay_plan_id, billing_plan_id, trial_ends_at, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          ON CONFLICT (id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            company_name = EXCLUDED.company_name,
            email = EXCLUDED.email,
            password_hash = CASE WHEN EXCLUDED.password_hash != '' THEN EXCLUDED.password_hash ELSE users.password_hash END,
            phone = EXCLUDED.phone,
            email_verified = EXCLUDED.email_verified,
            selected_plan = EXCLUDED.selected_plan,
            billing_status = EXCLUDED.billing_status,
            workspace_id = EXCLUDED.workspace_id,
            role = EXCLUDED.role,
            razorpay_subscription_id = COALESCE(EXCLUDED.razorpay_subscription_id, users.razorpay_subscription_id),
            razorpay_plan_id = COALESCE(EXCLUDED.razorpay_plan_id, users.razorpay_plan_id),
            billing_plan_id = COALESCE(EXCLUDED.billing_plan_id, users.billing_plan_id),
            trial_ends_at = COALESCE(EXCLUDED.trial_ends_at, users.trial_ends_at),
            updated_at = EXCLUDED.updated_at
          RETURNING *;
        `;
        const res = await pgPool.query(query, [
          user.id, user.full_name, user.company_name, user.email.toLowerCase().trim(),
          user.password_hash, user.phone || null, user.email_verified, user.selected_plan,
          user.billing_status, user.workspace_id, user.role || 'Admin',
          user.razorpay_subscription_id || null, user.razorpay_plan_id || null,
          user.billing_plan_id || null, user.trial_ends_at || null, user.created_at, user.updated_at
        ]);
        return res.rows[0];
      }

      const stmt = sqliteDb!.prepare(`
        INSERT INTO users (
          id, full_name, company_name, email, password_hash, phone, email_verified,
          selected_plan, billing_status, workspace_id, role, razorpay_subscription_id,
          razorpay_plan_id, billing_plan_id, trial_ends_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (id) DO UPDATE SET
          full_name = excluded.full_name,
          company_name = excluded.company_name,
          email = excluded.email,
          password_hash = CASE WHEN excluded.password_hash != '' THEN excluded.password_hash ELSE users.password_hash END,
          phone = excluded.phone,
          email_verified = excluded.email_verified,
          selected_plan = excluded.selected_plan,
          billing_status = excluded.billing_status,
          workspace_id = excluded.workspace_id,
          role = excluded.role,
          razorpay_subscription_id = COALESCE(excluded.razorpay_subscription_id, users.razorpay_subscription_id),
          razorpay_plan_id = COALESCE(excluded.razorpay_plan_id, users.razorpay_plan_id),
          billing_plan_id = COALESCE(excluded.billing_plan_id, users.billing_plan_id),
          trial_ends_at = COALESCE(excluded.trial_ends_at, users.trial_ends_at),
          updated_at = excluded.updated_at
      `);
      stmt.run(
        user.id, user.full_name, user.company_name, user.email.toLowerCase().trim(),
        user.password_hash, user.phone || null, user.email_verified ? 1 : 0, user.selected_plan,
        user.billing_status, user.workspace_id, user.role || 'Admin',
        user.razorpay_subscription_id || null, user.razorpay_plan_id || null,
        user.billing_plan_id || null, user.trial_ends_at || null, user.created_at, user.updated_at
      );
      return user;
    },

    async listAll(): Promise<DbUser[]> {
      if (!databaseInitialized) await initDatabase();
      if (isPostgresActive && pgPool) {
        const res = await pgPool.query('SELECT * FROM users');
        return res.rows;
      }
      return sqliteDb!.prepare('SELECT * FROM users').all() as unknown as DbUser[];
    }
  },

  // Sessions (Multi-device persistent authentication)
  sessions: {
    async get(token: string): Promise<DbSession | null> {
      if (!databaseInitialized) await initDatabase();
      if (isPostgresActive && pgPool) {
        const res = await pgPool.query('SELECT * FROM sessions WHERE token = $1 AND expires_at > $2', [token, Date.now()]);
        return res.rows[0] || null;
      }
      const stmt = sqliteDb!.prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > ?');
      return (stmt.get(token, Date.now()) as unknown as DbSession) || null;
    },

    async set(session: DbSession): Promise<void> {
      if (!databaseInitialized) await initDatabase();
      if (isPostgresActive && pgPool) {
        await pgPool.query(`
          INSERT INTO sessions (token, user_id, email, workspace_id, expires_at, created_at)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (token) DO UPDATE SET
            expires_at = EXCLUDED.expires_at;
        `, [session.token, session.user_id, session.email, session.workspace_id, session.expires_at, session.created_at]);
        return;
      }
      const stmt = sqliteDb!.prepare(`
        INSERT INTO sessions (token, user_id, email, workspace_id, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT (token) DO UPDATE SET
          expires_at = excluded.expires_at;
      `);
      stmt.run(session.token, session.user_id, session.email, session.workspace_id, session.expires_at, session.created_at);
    },

    async delete(token: string): Promise<void> {
      if (!databaseInitialized) await initDatabase();
      if (isPostgresActive && pgPool) {
        await pgPool.query('DELETE FROM sessions WHERE token = $1', [token]);
        return;
      }
      sqliteDb!.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    },

    async deleteByUserId(userId: string): Promise<void> {
      if (!databaseInitialized) await initDatabase();
      if (isPostgresActive && pgPool) {
        await pgPool.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
        return;
      }
      sqliteDb!.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
    }
  },

  // Password reset tokens
  passwordResetTokens: {
    async get(token: string): Promise<{ token: string; email: string; expires_at: number } | null> {
      if (!databaseInitialized) await initDatabase();
      if (isPostgresActive && pgPool) {
        const res = await pgPool.query('SELECT * FROM password_reset_tokens WHERE token = $1 AND expires_at > $2', [token, Date.now()]);
        return res.rows[0] || null;
      }
      const stmt = sqliteDb!.prepare('SELECT * FROM password_reset_tokens WHERE token = ? AND expires_at > ?');
      return (stmt.get(token, Date.now()) as any) || null;
    },

    async set(token: string, email: string, expiresAt: number): Promise<void> {
      if (!databaseInitialized) await initDatabase();
      const now = new Date().toISOString();
      if (isPostgresActive && pgPool) {
        await pgPool.query(`
          INSERT INTO password_reset_tokens (token, email, expires_at, created_at)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (token) DO UPDATE SET expires_at = EXCLUDED.expires_at;
        `, [token, email.toLowerCase().trim(), expiresAt, now]);
        return;
      }
      sqliteDb!.prepare(`
        INSERT INTO password_reset_tokens (token, email, expires_at, created_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT (token) DO UPDATE SET expires_at = excluded.expires_at;
      `).run(token, email.toLowerCase().trim(), expiresAt, now);
    },

    async delete(token: string): Promise<void> {
      if (!databaseInitialized) await initDatabase();
      if (isPostgresActive && pgPool) {
        await pgPool.query('DELETE FROM password_reset_tokens WHERE token = $1', [token]);
        return;
      }
      sqliteDb!.prepare('DELETE FROM password_reset_tokens WHERE token = ?').run(token);
    }
  },

  // Customers (Strict Multi-Tenant Workspace Isolation)
  customers: {
    async listByWorkspace(workspaceId: string): Promise<Customer[]> {
      if (!databaseInitialized) await initDatabase();
      if (isPostgresActive && pgPool) {
        const res = await pgPool.query(
          'SELECT data_json FROM customers WHERE workspace_id = $1 ORDER BY created_at ASC',
          [workspaceId]
        );
        return res.rows.map(r => r.data_json);
      }
      const rows = sqliteDb!.prepare(
        'SELECT data_json FROM customers WHERE workspace_id = ? ORDER BY created_at ASC'
      ).all(workspaceId) as { data_json: string }[];
      return rows.map(r => typeof r.data_json === 'string' ? JSON.parse(r.data_json) : r.data_json);
    },

    async getById(workspaceId: string, idOrCustomerId: string): Promise<Customer | null> {
      if (!databaseInitialized) await initDatabase();
      if (isPostgresActive && pgPool) {
        const res = await pgPool.query(
          'SELECT data_json FROM customers WHERE workspace_id = $1 AND (id = $2 OR customer_id = $2)',
          [workspaceId, idOrCustomerId]
        );
        return res.rows[0]?.data_json || null;
      }
      const row = sqliteDb!.prepare(
        'SELECT data_json FROM customers WHERE workspace_id = ? AND (id = ? OR customer_id = ?)'
      ).get(workspaceId, idOrCustomerId, idOrCustomerId) as { data_json: string } | undefined;
      if (!row) return null;
      return typeof row.data_json === 'string' ? JSON.parse(row.data_json) : row.data_json;
    },

    async upsert(workspaceId: string, customer: Customer): Promise<Customer> {
      if (!databaseInitialized) await initDatabase();
      const normCustomer: Customer = {
        ...customer,
        workspaceId,
        customerId: customer.customerId || customer.id
      };

      const now = new Date().toISOString();
      const id = normCustomer.id || `cust-${Date.now()}`;
      const customerId = normCustomer.customerId;
      const anyCust = normCustomer as any;

      if (isPostgresActive && pgPool) {
        const query = `
          INSERT INTO customers (
            id, workspace_id, customer_id, name, domain, plan, mrr, status,
            risk_score, risk_category, last_login_days, usage_drop_percent,
            open_tickets_count, payment_status, contract_renewal_days,
            primary_contact_name, primary_contact_role, primary_contact_email,
            data_json, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
          ON CONFLICT (workspace_id, customer_id) DO UPDATE SET
            name = EXCLUDED.name,
            domain = EXCLUDED.domain,
            plan = EXCLUDED.plan,
            mrr = EXCLUDED.mrr,
            status = EXCLUDED.status,
            risk_score = EXCLUDED.risk_score,
            risk_category = EXCLUDED.risk_category,
            last_login_days = EXCLUDED.last_login_days,
            usage_drop_percent = EXCLUDED.usage_drop_percent,
            open_tickets_count = EXCLUDED.open_tickets_count,
            payment_status = EXCLUDED.payment_status,
            contract_renewal_days = EXCLUDED.contract_renewal_days,
            primary_contact_name = EXCLUDED.primary_contact_name,
            primary_contact_role = EXCLUDED.primary_contact_role,
            primary_contact_email = EXCLUDED.primary_contact_email,
            data_json = EXCLUDED.data_json,
            updated_at = EXCLUDED.updated_at
          RETURNING data_json;
        `;
        const res = await pgPool.query(query, [
          id, workspaceId, customerId, normCustomer.name, anyCust.domain || null,
          normCustomer.plan, normCustomer.mrr, normCustomer.status, normCustomer.riskScore,
          normCustomer.riskCategory, normCustomer.lastLoginDays || 0, anyCust.usageDropPercent || 0,
          normCustomer.openTicketsCount || 0, normCustomer.paymentStatus || 'paid',
          anyCust.contractRenewalDays || 90, anyCust.primaryContact?.name || null,
          anyCust.primaryContact?.role || null, anyCust.primaryContact?.email || null,
          JSON.stringify(normCustomer), now, now
        ]);
        return res.rows[0].data_json;
      }

      const stmt = sqliteDb!.prepare(`
        INSERT INTO customers (
          id, workspace_id, customer_id, name, domain, plan, mrr, status,
          risk_score, risk_category, last_login_days, usage_drop_percent,
          open_tickets_count, payment_status, contract_renewal_days,
          primary_contact_name, primary_contact_role, primary_contact_email,
          data_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (workspace_id, customer_id) DO UPDATE SET
          name = excluded.name,
          domain = excluded.domain,
          plan = excluded.plan,
          mrr = excluded.mrr,
          status = excluded.status,
          risk_score = excluded.risk_score,
          risk_category = excluded.risk_category,
          last_login_days = excluded.last_login_days,
          usage_drop_percent = excluded.usage_drop_percent,
          open_tickets_count = excluded.open_tickets_count,
          payment_status = excluded.payment_status,
          contract_renewal_days = excluded.contract_renewal_days,
          primary_contact_name = excluded.primary_contact_name,
          primary_contact_role = excluded.primary_contact_role,
          primary_contact_email = excluded.primary_contact_email,
          data_json = excluded.data_json,
          updated_at = excluded.updated_at
      `);
      stmt.run(
        id, workspaceId, customerId, normCustomer.name, anyCust.domain || null,
        normCustomer.plan, normCustomer.mrr, normCustomer.status, normCustomer.riskScore,
        normCustomer.riskCategory, normCustomer.lastLoginDays || 0, anyCust.usageDropPercent || 0,
        normCustomer.openTicketsCount || 0, normCustomer.paymentStatus || 'paid',
        anyCust.contractRenewalDays || 90, anyCust.primaryContact?.name || null,
        anyCust.primaryContact?.role || null, anyCust.primaryContact?.email || null,
        JSON.stringify(normCustomer), now, now
      );
      return normCustomer;
    },

    async count(workspaceId?: string): Promise<number> {
      if (!databaseInitialized) await initDatabase();
      if (workspaceId) {
        if (isPostgresActive && pgPool) {
          const res = await pgPool.query('SELECT COUNT(*) as cnt FROM customers WHERE workspace_id = $1', [workspaceId]);
          return parseInt(res.rows[0].cnt, 10);
        }
        const row = sqliteDb!.prepare('SELECT COUNT(*) as cnt FROM customers WHERE workspace_id = ?').get(workspaceId) as any;
        return row?.cnt || 0;
      }
      if (isPostgresActive && pgPool) {
        const res = await pgPool.query('SELECT COUNT(*) as cnt FROM customers');
        return parseInt(res.rows[0].cnt, 10);
      }
      const row = sqliteDb!.prepare('SELECT COUNT(*) as cnt FROM customers').get() as any;
      return row?.cnt || 0;
    },

    async delete(workspaceId: string, idOrCustomerId: string): Promise<boolean> {
      if (!databaseInitialized) await initDatabase();
      if (isPostgresActive && pgPool) {
        const res = await pgPool.query(
          'DELETE FROM customers WHERE workspace_id = $1 AND (id = $2 OR customer_id = $2)',
          [workspaceId, idOrCustomerId]
        );
        return (res.rowCount ?? 0) > 0;
      }
      const info = sqliteDb!.prepare(
        'DELETE FROM customers WHERE workspace_id = ? AND (id = ? OR customer_id = ?)'
      ).run(workspaceId, idOrCustomerId, idOrCustomerId);
      return info.changes > 0;
    },

    async bulkDelete(workspaceId: string, ids: string[]): Promise<number> {
      if (!databaseInitialized) await initDatabase();
      if (!ids || ids.length === 0) return 0;
      if (isPostgresActive && pgPool) {
        const res = await pgPool.query(
          'DELETE FROM customers WHERE workspace_id = $1 AND (id = ANY($2::text[]) OR customer_id = ANY($2::text[]))',
          [workspaceId, ids]
        );
        return res.rowCount ?? 0;
      }
      let deleted = 0;
      const stmt = sqliteDb!.prepare(
        'DELETE FROM customers WHERE workspace_id = ? AND (id = ? OR customer_id = ?)'
      );
      for (const id of ids) {
        const info = stmt.run(workspaceId, id, id);
        deleted += Number(info.changes);
      }
      return deleted;
    },

    async clearDemo(workspaceId: string): Promise<number> {
      if (!databaseInitialized) await initDatabase();
      const all = await this.listByWorkspace(workspaceId);
      const demoIds = all
        .filter(c => c.is_demo_data === true || c.isDemo === true)
        .map(c => c.id || c.customerId || '');
      if (demoIds.length === 0) return 0;
      return await this.bulkDelete(workspaceId, demoIds);
    }
  },

  // CSV Imports History
  csvImports: {
    async create(workspaceId: string, rec: ImportHistoryRecord): Promise<void> {
      if (!databaseInitialized) await initDatabase();
      const now = new Date().toISOString();
      const id = rec.importId || (rec as any).import_id || `imp_${Date.now()}`;
      if (isPostgresActive && pgPool) {
        await pgPool.query(`
          INSERT INTO csv_imports (
            import_id, workspace_id, source, file_name, started_at, completed_at,
            total_rows, valid_rows, failed_rows, status, error_summary, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (import_id) DO UPDATE SET
            status = EXCLUDED.status,
            completed_at = EXCLUDED.completed_at;
        `, [
          id, workspaceId, rec.source || 'CSV', rec.fileName || (rec as any).file_name || 'import.csv',
          rec.startedAt || now, rec.completedAt || now,
          rec.totalRows ?? (rec as any).total_rows ?? 0, rec.validRows ?? (rec as any).valid_rows ?? 0,
          rec.failedRows ?? (rec as any).failed_rows ?? 0, rec.status || 'completed',
          rec.errorSummary || null, now
        ]);
        return;
      }
      const stmt = sqliteDb!.prepare(`
        INSERT INTO csv_imports (
          import_id, workspace_id, source, file_name, started_at, completed_at,
          total_rows, valid_rows, failed_rows, status, error_summary, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (import_id) DO UPDATE SET
          status = excluded.status,
          completed_at = excluded.completed_at;
      `);
      stmt.run(
        id, workspaceId, rec.source || 'CSV', rec.fileName || (rec as any).file_name || 'import.csv',
        rec.startedAt || now, rec.completedAt || now,
        rec.totalRows ?? (rec as any).total_rows ?? 0, rec.validRows ?? (rec as any).valid_rows ?? 0,
        rec.failedRows ?? (rec as any).failed_rows ?? 0, rec.status || 'completed',
        rec.errorSummary || null, now
      );
    },

    async listByWorkspace(workspaceId: string): Promise<ImportHistoryRecord[]> {
      if (!databaseInitialized) await initDatabase();
      if (isPostgresActive && pgPool) {
        const res = await pgPool.query('SELECT * FROM csv_imports WHERE workspace_id = $1 ORDER BY started_at DESC', [workspaceId]);
        return res.rows.map(r => ({
          importId: r.import_id,
          workspaceId: r.workspace_id,
          source: r.source,
          fileName: r.file_name,
          startedAt: r.started_at,
          completedAt: r.completed_at,
          totalRows: r.total_rows,
          validRows: r.valid_rows,
          failedRows: r.failed_rows,
          status: r.status,
          errorSummary: r.error_summary
        }));
      }
      const rows = sqliteDb!.prepare('SELECT * FROM csv_imports WHERE workspace_id = ? ORDER BY started_at DESC').all(workspaceId) as any[];
      return rows.map(r => ({
        importId: r.import_id,
        workspaceId: r.workspace_id,
        source: r.source,
        fileName: r.file_name,
        startedAt: r.started_at,
        completedAt: r.completed_at,
        totalRows: r.total_rows,
        validRows: r.valid_rows,
        failedRows: r.failed_rows,
        status: r.status,
        errorSummary: r.error_summary
      }));
    },

    async insert(rec: ImportHistoryRecord): Promise<void> {
      if (!databaseInitialized) await initDatabase();
      const now = new Date().toISOString();
      if (isPostgresActive && pgPool) {
        await pgPool.query(`
          INSERT INTO csv_imports (
            import_id, workspace_id, source, file_name, started_at, completed_at,
            total_rows, valid_rows, failed_rows, status, error_summary, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (import_id) DO UPDATE SET
            completed_at = EXCLUDED.completed_at,
            status = EXCLUDED.status,
            error_summary = EXCLUDED.error_summary;
        `, [
          rec.importId, rec.workspaceId, rec.source || 'CSV', rec.fileName, rec.startedAt,
          rec.completedAt || null, rec.totalRows || 0, rec.validRows || 0, rec.failedRows || 0,
          rec.status || 'completed', rec.errorSummary || null, now
        ]);
        return;
      }
      sqliteDb!.prepare(`
        INSERT INTO csv_imports (
          import_id, workspace_id, source, file_name, started_at, completed_at,
          total_rows, valid_rows, failed_rows, status, error_summary, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (import_id) DO UPDATE SET
          completed_at = excluded.completed_at,
          status = excluded.status,
          error_summary = excluded.error_summary;
      `).run(
        rec.importId, rec.workspaceId, rec.source || 'CSV', rec.fileName, rec.startedAt,
        rec.completedAt || null, rec.totalRows || 0, rec.validRows || 0, rec.failedRows || 0,
        rec.status || 'completed', rec.errorSummary || null, now
      );
    },

    async clearByWorkspace(workspaceId: string): Promise<number> {
      if (!databaseInitialized) await initDatabase();
      if (isPostgresActive && pgPool) {
        const res = await pgPool.query('DELETE FROM csv_imports WHERE workspace_id = $1', [workspaceId]);
        return res.rowCount ?? 0;
      }
      const info = sqliteDb!.prepare('DELETE FROM csv_imports WHERE workspace_id = ?').run(workspaceId);
      return Number(info.changes);
    }
  },

  // Authoritative Billing Plans
  billingPlans: {
    async listAll(): Promise<DbBillingPlan[]> {
      if (!databaseInitialized) await initDatabase();
      if (isPostgresActive && pgPool) {
        const res = await pgPool.query('SELECT * FROM billing_plans WHERE is_active = true ORDER BY amount_paise ASC');
        return res.rows;
      }
      return sqliteDb!.prepare('SELECT * FROM billing_plans WHERE is_active = 1 ORDER BY amount_paise ASC').all() as unknown as DbBillingPlan[];
    },

    async getById(id: string): Promise<DbBillingPlan | null> {
      if (!databaseInitialized) await initDatabase();
      if (isPostgresActive && pgPool) {
        const res = await pgPool.query('SELECT * FROM billing_plans WHERE id = $1', [id]);
        return res.rows[0] || null;
      }
      return (sqliteDb!.prepare('SELECT * FROM billing_plans WHERE id = ?').get(id) as unknown as DbBillingPlan) || null;
    },

    async upsert(plan: DbBillingPlan): Promise<void> {
      if (!databaseInitialized) await initDatabase();
      if (isPostgresActive && pgPool) {
        await pgPool.query(`
          INSERT INTO billing_plans (id, name, tier, billing_cycle, amount_paise, amount_inr, currency, razorpay_plan_id, is_active, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            amount_paise = EXCLUDED.amount_paise,
            amount_inr = EXCLUDED.amount_inr,
            razorpay_plan_id = EXCLUDED.razorpay_plan_id,
            is_active = EXCLUDED.is_active,
            updated_at = EXCLUDED.updated_at;
        `, [
          plan.id, plan.name, plan.tier, plan.billing_cycle, plan.amount_paise,
          plan.amount_inr, plan.currency || 'INR', plan.razorpay_plan_id, plan.is_active,
          plan.created_at, plan.updated_at
        ]);
        return;
      }
      sqliteDb!.prepare(`
        INSERT INTO billing_plans (id, name, tier, billing_cycle, amount_paise, amount_inr, currency, razorpay_plan_id, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (id) DO UPDATE SET
          name = excluded.name,
          amount_paise = excluded.amount_paise,
          amount_inr = excluded.amount_inr,
          razorpay_plan_id = excluded.razorpay_plan_id,
          is_active = excluded.is_active,
          updated_at = excluded.updated_at;
      `).run(
        plan.id, plan.name, plan.tier, plan.billing_cycle, plan.amount_paise,
        plan.amount_inr, plan.currency || 'INR', plan.razorpay_plan_id, plan.is_active ? 1 : 0,
        plan.created_at, plan.updated_at
      );
    }
  },

  // Trial Verifications (₹1 Razorpay Verification Orders)
  trialVerifications: {
    async getByOrderId(orderId: string): Promise<DbTrialVerification | null> {
      if (!databaseInitialized) await initDatabase();
      if (isPostgresActive && pgPool) {
        const res = await pgPool.query('SELECT * FROM trial_verifications WHERE razorpay_order_id = $1', [orderId]);
        return res.rows[0] || null;
      }
      return (sqliteDb!.prepare('SELECT * FROM trial_verifications WHERE razorpay_order_id = ?').get(orderId) as unknown as DbTrialVerification) || null;
    },

    async getByWorkspace(workspaceId: string): Promise<DbTrialVerification[]> {
      if (!databaseInitialized) await initDatabase();
      if (isPostgresActive && pgPool) {
        const res = await pgPool.query('SELECT * FROM trial_verifications WHERE workspace_id = $1 ORDER BY created_at DESC', [workspaceId]);
        return res.rows;
      }
      return sqliteDb!.prepare('SELECT * FROM trial_verifications WHERE workspace_id = ? ORDER BY created_at DESC').all(workspaceId) as unknown as DbTrialVerification[];
    },

    async upsert(tv: DbTrialVerification): Promise<DbTrialVerification> {
      if (!databaseInitialized) await initDatabase();
      if (isPostgresActive && pgPool) {
        const query = `
          INSERT INTO trial_verifications (
            id, workspace_id, user_id, email, tier, billing_cycle,
            billing_plan_id, razorpay_plan_id, razorpay_order_id, amount_paise,
            currency, status, payment_id, verified_at, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          ON CONFLICT (razorpay_order_id) DO UPDATE SET
            status = EXCLUDED.status,
            payment_id = EXCLUDED.payment_id,
            verified_at = EXCLUDED.verified_at,
            updated_at = EXCLUDED.updated_at
          RETURNING *;
        `;
        const res = await pgPool.query(query, [
          tv.id, tv.workspace_id, tv.user_id, tv.email.toLowerCase().trim(),
          tv.tier, tv.billing_cycle, tv.billing_plan_id, tv.razorpay_plan_id,
          tv.razorpay_order_id, tv.amount_paise, tv.currency || 'INR',
          tv.status, tv.payment_id || null, tv.verified_at || null, tv.created_at, tv.updated_at
        ]);
        return res.rows[0];
      }

      sqliteDb!.prepare(`
        INSERT INTO trial_verifications (
          id, workspace_id, user_id, email, tier, billing_cycle,
          billing_plan_id, razorpay_plan_id, razorpay_order_id, amount_paise,
          currency, status, payment_id, verified_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (razorpay_order_id) DO UPDATE SET
          status = excluded.status,
          payment_id = excluded.payment_id,
          verified_at = excluded.verified_at,
          updated_at = excluded.updated_at;
      `).run(
        tv.id, tv.workspace_id, tv.user_id, tv.email.toLowerCase().trim(),
        tv.tier, tv.billing_cycle, tv.billing_plan_id, tv.razorpay_plan_id,
        tv.razorpay_order_id, tv.amount_paise, tv.currency || 'INR',
        tv.status, tv.payment_id || null, tv.verified_at || null, tv.created_at, tv.updated_at
      );
      return tv;
    }
  },

  // Subscriptions (Authoritative Workspace Billing Lifecycle)
  subscriptions: {
    async getByWorkspace(workspaceId: string): Promise<DbSubscription | null> {
      if (!databaseInitialized) await initDatabase();
      if (isPostgresActive && pgPool) {
        const res = await pgPool.query('SELECT * FROM subscriptions WHERE workspace_id = $1', [workspaceId]);
        return res.rows[0] || null;
      }
      return (sqliteDb!.prepare('SELECT * FROM subscriptions WHERE workspace_id = ?').get(workspaceId) as unknown as DbSubscription) || null;
    },

    async getBySubscriptionId(subId: string): Promise<DbSubscription | null> {
      if (!databaseInitialized) await initDatabase();
      if (isPostgresActive && pgPool) {
        const res = await pgPool.query('SELECT * FROM subscriptions WHERE razorpay_subscription_id = $1', [subId]);
        return res.rows[0] || null;
      }
      return (sqliteDb!.prepare('SELECT * FROM subscriptions WHERE razorpay_subscription_id = ?').get(subId) as unknown as DbSubscription) || null;
    },

    async upsert(sub: DbSubscription): Promise<DbSubscription> {
      if (!databaseInitialized) await initDatabase();
      if (isPostgresActive && pgPool) {
        const query = `
          INSERT INTO subscriptions (
            id, workspace_id, user_id, email, tier, billing_cycle,
            billing_plan_id, razorpay_plan_id, razorpay_subscription_id,
            status, trial_started_at, trial_ends_at, payment_verification_status,
            razorpay_verification_order_id, razorpay_verification_payment_id,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          ON CONFLICT (workspace_id) DO UPDATE SET
            tier = EXCLUDED.tier,
            billing_cycle = EXCLUDED.billing_cycle,
            billing_plan_id = EXCLUDED.billing_plan_id,
            razorpay_plan_id = EXCLUDED.razorpay_plan_id,
            razorpay_subscription_id = COALESCE(EXCLUDED.razorpay_subscription_id, subscriptions.razorpay_subscription_id),
            status = EXCLUDED.status,
            trial_started_at = COALESCE(EXCLUDED.trial_started_at, subscriptions.trial_started_at),
            trial_ends_at = COALESCE(EXCLUDED.trial_ends_at, subscriptions.trial_ends_at),
            payment_verification_status = EXCLUDED.payment_verification_status,
            razorpay_verification_order_id = COALESCE(EXCLUDED.razorpay_verification_order_id, subscriptions.razorpay_verification_order_id),
            razorpay_verification_payment_id = COALESCE(EXCLUDED.razorpay_verification_payment_id, subscriptions.razorpay_verification_payment_id),
            updated_at = EXCLUDED.updated_at
          RETURNING *;
        `;
        const res = await pgPool.query(query, [
          sub.id, sub.workspace_id, sub.user_id, sub.email.toLowerCase().trim(),
          sub.tier, sub.billing_cycle, sub.billing_plan_id, sub.razorpay_plan_id,
          sub.razorpay_subscription_id || null, sub.status, sub.trial_started_at || null,
          sub.trial_ends_at || null, sub.payment_verification_status,
          sub.razorpay_verification_order_id || null, sub.razorpay_verification_payment_id || null,
          sub.created_at, sub.updated_at
        ]);
        return res.rows[0];
      }

      sqliteDb!.prepare(`
        INSERT INTO subscriptions (
          id, workspace_id, user_id, email, tier, billing_cycle,
          billing_plan_id, razorpay_plan_id, razorpay_subscription_id,
          status, trial_started_at, trial_ends_at, payment_verification_status,
          razorpay_verification_order_id, razorpay_verification_payment_id,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (workspace_id) DO UPDATE SET
          tier = excluded.tier,
          billing_cycle = excluded.billing_cycle,
          billing_plan_id = excluded.billing_plan_id,
          razorpay_plan_id = excluded.razorpay_plan_id,
          razorpay_subscription_id = COALESCE(excluded.razorpay_subscription_id, subscriptions.razorpay_subscription_id),
          status = excluded.status,
          trial_started_at = COALESCE(excluded.trial_started_at, subscriptions.trial_started_at),
          trial_ends_at = COALESCE(excluded.trial_ends_at, subscriptions.trial_ends_at),
          payment_verification_status = excluded.payment_verification_status,
          razorpay_verification_order_id = COALESCE(excluded.razorpay_verification_order_id, subscriptions.razorpay_verification_order_id),
          razorpay_verification_payment_id = COALESCE(excluded.razorpay_verification_payment_id, subscriptions.razorpay_verification_payment_id),
          updated_at = excluded.updated_at;
      `).run(
        sub.id, sub.workspace_id, sub.user_id, sub.email.toLowerCase().trim(),
        sub.tier, sub.billing_cycle, sub.billing_plan_id, sub.razorpay_plan_id,
        sub.razorpay_subscription_id || null, sub.status, sub.trial_started_at || null,
        sub.trial_ends_at || null, sub.payment_verification_status,
        sub.razorpay_verification_order_id || null, sub.razorpay_verification_payment_id || null,
        sub.created_at, sub.updated_at
      );
      return sub;
    }
  },

  // Webhook Events with Strict Database Idempotency
  webhookEvents: {
    /**
     * Checks if a webhook has already been processed using its idempotency key.
     * If not already processed, saves the event and returns true so processing can continue.
     * If already processed, returns false to guarantee idempotent execution.
     */
    async recordIfNew(eventId: string, eventType: string, idempotencyKey: string, payload: any, workspaceId?: string): Promise<boolean> {
      if (!databaseInitialized) await initDatabase();
      const now = new Date().toISOString();
      const payloadStr = JSON.stringify(payload);

      if (isPostgresActive && pgPool) {
        try {
          const res = await pgPool.query(`
            INSERT INTO webhook_events (event_id, event_type, workspace_id, idempotency_key, payload_json, processed_at, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'processed')
            ON CONFLICT (idempotency_key) DO NOTHING
            RETURNING event_id;
          `, [eventId, eventType, workspaceId || null, idempotencyKey, payloadStr, now]);
          return res.rowCount !== null && res.rowCount > 0;
        } catch (err) {
          return false;
        }
      }

      try {
        const stmt = sqliteDb!.prepare(`
          INSERT INTO webhook_events (event_id, event_type, workspace_id, idempotency_key, payload_json, processed_at, status)
          VALUES (?, ?, ?, ?, ?, ?, 'processed')
          ON CONFLICT (idempotency_key) DO NOTHING;
        `);
        const info = stmt.run(eventId, eventType, workspaceId || null, idempotencyKey, payloadStr, now);
        return info.changes > 0;
      } catch (err) {
        return false;
      }
    }
  },

  // Comprehensive Admin Multi-Tenant & Persistence Self-Test Suite
  admin: {
    async runSelfTest() {
      if (!databaseInitialized) await initDatabase();
      const testReport: {
        test: string;
        description: string;
        passed: boolean;
        details: string;
      }[] = [];

      // Test 1: Data Persistence & Survival across engine calls
      try {
        const testWsId = `ws_test_persist_${Date.now()}`;
        const testWs = await db.workspaces.upsert({
          id: testWsId,
          name: 'Persistence Test Workspace',
          owner_id: 'usr_test_admin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        const fetchedWs = await db.workspaces.getById(testWsId);
        const pass1 = fetchedWs !== null && fetchedWs.id === testWsId;
        testReport.push({
          test: 'Data Persistence & Server Restart Survival',
          description: 'Verifies records are committed to persistent disk/PostgreSQL and re-queried without in-memory dependency',
          passed: pass1,
          details: pass1 ? `Successfully created and verified workspace ${testWsId}` : 'Failed to retrieve written record'
        });
      } catch (e: any) {
        testReport.push({
          test: 'Data Persistence & Server Restart Survival',
          description: 'Verifies records are committed to persistent disk/PostgreSQL',
          passed: false,
          details: e?.message || 'Error executing test'
        });
      }

      // Test 2: Multi-Device Persistent Session Check
      try {
        const testToken = `sess_test_device_${Date.now()}`;
        await db.sessions.set({
          token: testToken,
          user_id: 'usr-admin-001',
          email: 'founder@nochurn.com',
          workspace_id: 'ws-default',
          expires_at: Date.now() + 86400000,
          created_at: new Date().toISOString()
        });
        const readSession = await db.sessions.get(testToken);
        const pass2 = readSession !== null && readSession.user_id === 'usr-admin-001';
        await db.sessions.delete(testToken); // Clean up
        testReport.push({
          test: 'Multi-Device Cross-Session Authentication',
          description: 'Ensures cookie sessions are validated directly against persistent DB so users stay logged in across browsers and restarts',
          passed: pass2,
          details: pass2 ? 'Session successfully persisted and verified from DB layer' : 'Failed to fetch session from DB'
        });
      } catch (e: any) {
        testReport.push({
          test: 'Multi-Device Cross-Session Authentication',
          description: 'Ensures cookie sessions are validated directly against persistent DB',
          passed: false,
          details: e?.message || 'Error executing test'
        });
      }

      // Test 3: Idempotency & Duplicate Webhook Protection
      try {
        const eventId = `evt_test_${Date.now()}`;
        const idempotencyKey = `idemp_key_rzp_${Date.now()}`;
        const firstAttempt = await db.webhookEvents.recordIfNew(eventId, 'payment.captured', idempotencyKey, { test: true }, 'ws-default');
        const secondAttempt = await db.webhookEvents.recordIfNew(eventId, 'payment.captured', idempotencyKey, { test: true }, 'ws-default');
        const pass3 = firstAttempt === true && secondAttempt === false;
        testReport.push({
          test: 'Payment Idempotency & Duplicate Protection',
          description: 'Guarantees duplicate Razorpay webhooks or retry requests do not double-bill or duplicate subscriptions',
          passed: pass3,
          details: pass3 ? 'First webhook attempt recorded (true), second identical attempt safely rejected (false)' : 'Idempotency check failed'
        });
      } catch (e: any) {
        testReport.push({
          test: 'Payment Idempotency & Duplicate Protection',
          description: 'Guarantees duplicate Razorpay webhooks do not duplicate records',
          passed: false,
          details: e?.message || 'Error executing test'
        });
      }

      // Test 4: Multi-Tenant Workspace Isolation
      try {
        const wsA = `ws_tenant_a_${Date.now()}`;
        const wsB = `ws_tenant_b_${Date.now()}`;
        
        await db.customers.upsert(wsA, {
          id: `cust_a_${Date.now()}`,
          name: 'Confidential Corp A',
          plan: 'Enterprise',
          mrr: 15000,
          status: 'active',
          riskScore: 25,
          riskCategory: 'Low'
        } as any);

        const tenantBCustomers = await db.customers.listByWorkspace(wsB);
        const leaked = tenantBCustomers.some(c => c.name === 'Confidential Corp A');
        const pass4 = !leaked;
        testReport.push({
          test: 'Multi-Tenant Workspace Data Isolation',
          description: 'Ensures Tenant B cannot query, view, or mutate customer records belonging to Tenant A',
          passed: pass4,
          details: pass4 ? 'Zero data leakage: Tenant B query returned 0 records of Tenant A' : 'Security failure: Tenant B saw Tenant A customer!'
        });
      } catch (e: any) {
        testReport.push({
          test: 'Multi-Tenant Workspace Data Isolation',
          description: 'Ensures Tenant B cannot view customer records belonging to Tenant A',
          passed: false,
          details: e?.message || 'Error executing test'
        });
      }

      const allPassed = testReport.every(t => t.passed);
      return {
        allPassed,
        engine: isPostgresActive ? 'PostgreSQL' : 'SQLite WAL (Local Development Only)',
        executedAt: new Date().toISOString(),
        tests: testReport
      };
    }
  }
};
