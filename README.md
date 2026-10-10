# NoChurn AI

India-first B2B SaaS Churn Prediction & Revenue Retention Platform.

## Railway Deployment Guide

NoChurn is fully configured for production deployment on Railway using Railway PostgreSQL.

### Railway Commands

- **Railway Build Command**: `npm run build`
- **Railway Start Command**: `node dist/server.cjs`
- **Database Migration Command**: `npm run db:migrate` (or automatically executed during startup)

### Required Environment Variables

Configure the following variables in the Railway dashboard for the service:

| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | Connection string provided automatically by Railway PostgreSQL |
| `RAZORPAY_KEY_ID` | Razorpay Key ID (`rzp_test_...` for test mode) |
| `RAZORPAY_KEY_SECRET` | Razorpay Key Secret |
| `RAZORPAY_WEBHOOK_SECRET` | Secret used to cryptographically verify Razorpay webhooks |
| `GEMINI_API_KEY` | Google Gemini API Key for AI churn scoring and retention playbooks |
| `NODE_ENV` | `production` |

### Architecture & Persistence

- **Production Database**: Managed PostgreSQL via `DATABASE_URL`. In `production`, SQLite fallback is strictly blocked to prevent any data loss on container rebuilds or scale-to-zero.
- **Port Binding**: Binds to `0.0.0.0` and `process.env.PORT`.
- **Health Check**: `/api/health` reports status, Gemini availability, and `database.engine = "PostgreSQL"`.
- **Admin Self-Test**: `/api/admin/db-test` runs an automated 4-point verification suite validating data persistence, session persistence, payment idempotency, and multi-tenant isolation.
