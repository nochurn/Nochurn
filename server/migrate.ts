import 'dotenv/config';
import { Pool } from 'pg';
import crypto from 'crypto';
import { SAMPLE_CUSTOMERS } from '../src/data/sampleCustomers.ts';
import { runPostgresMigrations } from './db.ts';

async function migrate() {
  const rawDbUrl = (process.env.DATABASE_URL || process.env.POSTGRES_URL || '').trim();
  const isPostgresUrl = rawDbUrl.startsWith('postgresql://') || rawDbUrl.startsWith('postgres://');

  if (!rawDbUrl || !isPostgresUrl) {
    console.error('❌ [NoChurn Migration Error] A valid postgresql:// DATABASE_URL environment variable is required.');
    if (rawDbUrl && rawDbUrl.startsWith('http')) {
      console.error(`Received HTTP REST URL instead of PostgreSQL connection string: ${rawDbUrl}`);
    } else {
      console.error('Expected format: postgresql://user:password@host:port/database');
    }
    process.exit(1);
  }

  const dbUrl = rawDbUrl;

  console.log('🔄 [NoChurn Migration] Connecting to Railway PostgreSQL...');

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1') || dbUrl.includes('.railway.internal'))
      ? false
      : { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  });

  try {
    const client = await pool.connect();
    console.log('✅ [NoChurn Migration] Connected to PostgreSQL. Running database DDL migrations...');
    client.release();

    // 1. Run core schema DDL migrations (workspaces, users, sessions, subscriptions, customers, etc.)
    await runPostgresMigrations(pool);
    console.log('✅ [NoChurn Migration] Schema DDL tables and constraints verified.');

    // 2. Seed default workspace if absent
    const wsRes = await pool.query("SELECT id FROM workspaces WHERE id = 'ws-default'");
    if (wsRes.rowCount === 0) {
      await pool.query(
        "INSERT INTO workspaces (id, name, owner_id, created_at, updated_at) VALUES ('ws-default', 'AcquiredSaaS Inc', 'usr-admin-001', NOW(), NOW())"
      );
      console.log('✅ [NoChurn Migration] Seeded default workspace (ws-default).');
    }

    // 3. Seed default admin user if absent
    const userRes = await pool.query("SELECT id FROM users WHERE id = 'usr-admin-001'");
    if (userRes.rowCount === 0) {
      const defaultSalt = 'a1b2c3d4e5f67890';
      const defaultHash = crypto.scryptSync('Password123!', defaultSalt, 64).toString('hex');
      const defaultPasswordCombined = `${defaultSalt}:${defaultHash}`;

      await pool.query(
        `INSERT INTO users (
          id, full_name, company_name, email, password_hash, phone, email_verified,
          selected_plan, billing_status, workspace_id, role, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
        [
          'usr-admin-001',
          'Nagesh Sharat',
          'AcquiredSaaS Inc',
          'nageshsharat@gmail.com',
          defaultPasswordCombined,
          '+1 (415) 890-2144',
          true,
          'growth',
          'active',
          'ws-default',
          'Admin'
        ]
      );
      console.log('✅ [NoChurn Migration] Seeded default admin user (nageshsharat@gmail.com).');
    }

    // 4. Seed default session if absent
    const sessRes = await pool.query("SELECT token FROM sessions WHERE token = 'sess_admin_default'");
    if (sessRes.rowCount === 0) {
      await pool.query(
        `INSERT INTO sessions (token, user_id, email, workspace_id, expires_at, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          'sess_admin_default',
          'usr-admin-001',
          'nageshsharat@gmail.com',
          'ws-default',
          Date.now() + 30 * 86400000
        ]
      );
      console.log('✅ [NoChurn Migration] Seeded default session (sess_admin_default).');
    }

    // 5. Seed authoritative billing plans if absent
    const plansToSeed = [
      {
        id: 'plan_tier_starter_monthly',
        name: 'NoChurn Starter',
        tier: 'starter',
        billing_cycle: 'monthly',
        amount_paise: 499900,
        amount_inr: 4999,
        currency: 'INR',
        razorpay_plan_id: process.env.RAZORPAY_PLAN_STARTER_MONTHLY || 'plan_TeZlsQOQaeAWAw'
      },
      {
        id: 'plan_tier_starter_annual',
        name: 'NoChurn Starter — Annual',
        tier: 'starter',
        billing_cycle: 'annual',
        amount_paise: 4919016,
        amount_inr: 49190.16,
        currency: 'INR',
        razorpay_plan_id: process.env.RAZORPAY_PLAN_STARTER_ANNUAL || 'plan_TeZMQYLVPEtQuj'
      },
      {
        id: 'plan_tier_growth_monthly',
        name: 'NoChurn Growth - Monthly',
        tier: 'growth',
        billing_cycle: 'monthly',
        amount_paise: 1299900,
        amount_inr: 12999,
        currency: 'INR',
        razorpay_plan_id: process.env.RAZORPAY_PLAN_GROWTH_MONTHLY || 'plan_TeZQFjmJoxrnKM'
      },
      {
        id: 'plan_tier_growth_annual',
        name: 'NoChurn Growth - Annual',
        tier: 'growth',
        billing_cycle: 'annual',
        amount_paise: 12791016,
        amount_inr: 127910.16,
        currency: 'INR',
        razorpay_plan_id: process.env.RAZORPAY_PLAN_GROWTH_ANNUAL || 'plan_TfXxPsAOqPYklF'
      },
      {
        id: 'plan_tier_pro_monthly',
        name: 'NoChurn Pro - Monthly',
        tier: 'pro',
        billing_cycle: 'monthly',
        amount_paise: 2999900,
        amount_inr: 29999,
        currency: 'INR',
        razorpay_plan_id: process.env.RAZORPAY_PLAN_PRO_MONTHLY || 'plan_TeZraPPrYthtEk'
      },
      {
        id: 'plan_tier_pro_annual',
        name: 'NoChurn Pro - Annual',
        tier: 'pro',
        billing_cycle: 'annual',
        amount_paise: 29519016,
        amount_inr: 295190.16,
        currency: 'INR',
        razorpay_plan_id: process.env.RAZORPAY_PLAN_PRO_ANNUAL || 'plan_Tea17dB6H4EHdn'
      }
    ];

    for (const plan of plansToSeed) {
      await pool.query(
        `INSERT INTO billing_plans (
          id, name, tier, billing_cycle, amount_paise, amount_inr, currency, razorpay_plan_id, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          amount_paise = EXCLUDED.amount_paise,
          amount_inr = EXCLUDED.amount_inr,
          razorpay_plan_id = EXCLUDED.razorpay_plan_id,
          is_active = EXCLUDED.is_active,
          updated_at = NOW()`,
        [plan.id, plan.name, plan.tier, plan.billing_cycle, plan.amount_paise, plan.amount_inr, plan.currency, plan.razorpay_plan_id]
      );
    }
    console.log('✅ [NoChurn Migration] Seeded/updated 6 authoritative billing plans.');

    // 6. Safe demo customer seeding: Only if table is empty
    const custCountRes = await pool.query("SELECT COUNT(*) as count FROM customers WHERE workspace_id = 'ws-default'");
    const currentCustCount = parseInt(custCountRes.rows[0]?.count || '0', 10);

    if (currentCustCount === 0) {
      console.log(`📦 [NoChurn Migration] Seeding ${SAMPLE_CUSTOMERS.length} initial demo customers into PostgreSQL...`);
      for (const c of SAMPLE_CUSTOMERS) {
        const anyCust = c as any;
        await pool.query(
          `INSERT INTO customers (
            id, workspace_id, customer_id, name, domain, plan, mrr, status,
            risk_score, risk_category, last_login_days, usage_drop_percent,
            open_tickets_count, payment_status, contract_renewal_days,
            primary_contact_name, primary_contact_role, primary_contact_email,
            data_json, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())
          ON CONFLICT (workspace_id, customer_id) DO NOTHING`,
          [
            c.id,
            'ws-default',
            c.id,
            c.name,
            c.companyDomain || null,
            c.plan,
            c.mrr,
            c.status,
            c.riskScore,
            c.riskCategory,
            c.lastLoginDays,
            Math.abs(c.usageTrendPercentage),
            c.openTicketsCount,
            c.paymentStatus,
            anyCust.contractRenewalDays || anyCust.daysUntilRenewal || 90,
            anyCust.primaryContact?.name || null,
            anyCust.primaryContact?.role || null,
            anyCust.primaryContact?.email || null,
            JSON.stringify(c)
          ]
        );
      }
      console.log(`✅ [NoChurn Migration] Successfully seeded ${SAMPLE_CUSTOMERS.length} initial customers.`);
    } else {
      console.log(`ℹ️ [NoChurn Migration] Customers table already contains ${currentCustCount} records. Skipping demo seed.`);
    }

    await pool.end();
    console.log('🎉 [NoChurn Migration] Database migration completed successfully on Railway PostgreSQL.');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ [NoChurn Migration Failed]:', err?.message || err);
    await pool.end().catch(() => {});
    process.exit(1);
  }
}

migrate();
