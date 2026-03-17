# Supabase Setup Guide

## 1. Create Your Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in (or create an account)
2. Click **New Project**
3. Choose your organization, give it a name (e.g., `financial-assistant`), set a strong database password, and pick a region close to your VPS
4. Wait for the project to provision (~2 minutes)

## 2. Save Your Credentials

Once the project is ready, grab these from **Settings → API**:

| Credential | Where to find it | Used by |
|---|---|---|
| Project URL | `Settings → API → Project URL` | MCP server, webhook receiver |
| `anon` key | `Settings → API → Project API keys` | Not used (blocked by RLS) |
| `service_role` key | `Settings → API → Project API keys` | MCP server, webhook receiver |
| Database password | You set this during project creation | Direct DB connections (optional) |

**Important:** The `service_role` key bypasses RLS and has full access. Never expose it in client-side code. Store it in environment variables only.

## 3. Run the Migration

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Paste the entire contents of `supabase-migration.sql`
4. Click **Run**

You should see all tables created successfully. Verify by checking the **Table Editor** — you should see: `institutions`, `accounts`, `transactions`, and `sync_log`.

## 4. Verify the Setup

Run this quick check in the SQL Editor:

```sql
-- Should return 4 tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Should show RLS is enabled on all 4
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Should show your indexes
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename;
```

## 5. Environment Variables for Next Steps

Create a `.env` file for your project (you'll use this for both the webhook server and MCP server):

```env
# Supabase
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Plaid (you already have these)
PLAID_CLIENT_ID=your-client-id
PLAID_SECRET=your-secret
PLAID_ENV=sandbox  # change to "production" when ready
```

## Next Steps

Once Supabase is set up and verified, we'll move on to:
- **Step 4:** Plaid Link flow — one-time script to connect your bank accounts
- **Step 5:** Webhook receiver — Node.js server on your DigitalOcean VPS
- **Step 6:** MCP server — local server with `execute_query` + `get_schema`
