# External Integrations

**Analysis Date:** 2026-03-10

## APIs & External Services

**Banking (Plaid):**
- Plaid - Primary bank data aggregation service
  - SDK/Client: `plaid` ^28.0.0 npm package
  - Auth: `PLAID_CLIENT_ID` and `PLAID_SECRET` env vars
  - Endpoints used:
    - `/link_token/create` - Generate link token for Plaid Link flow (in `link-account/server.js`)
    - `/item/public_token/exchange` - Exchange public token for access token after OAuth (in `link-account/server.js`)
    - `/accounts/get` - Fetch all accounts for a connected institution (in `link-account/server.js`)
    - `/transactions/sync` - Fetch incremental transaction updates (in `webhook/index.js` and `link-account/server.js`)
    - `/webhook_verification_key/get` - Fetch JWK for webhook signature verification (in `webhook/index.js`)

**AI Integration (Claude):**
- Model Context Protocol (MCP) Server
  - SDK: `@modelcontextprotocol/sdk` ^1.12.1
  - Location: `mcp-server/index.js` (stdio transport)
  - Alternative: `mcp-server/server-http.js` (HTTP transport)
  - Exposed tools: `get_schema`, `execute_query`

## Data Storage

**Databases:**
- **Supabase (PostgreSQL)**
  - Connection: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` env vars
  - Client: `@supabase/supabase-js` ^2.49.4
  - Schema:
    - `institutions` - Connected bank accounts (one per Plaid item)
    - `accounts` - Individual accounts within each institution
    - `transactions` - All transactions from synced accounts
    - `sync_log` - Audit trail of sync events and cursor positions
  - RLS (Row-Level Security): Enabled on all tables, restricted to service_role
  - RPC functions:
    - `get_schema_info()` - Returns database schema metadata for MCP server
    - `execute_sql(query_text)` - Executes SELECT-only queries for MCP server
    - `insert_query_log()` - Logs all queries for debugging and analytics

**File Storage:**
- Local filesystem only for recovery data
  - `.recovery.json` in `link-account/` - Stores access token and metadata if setup fails mid-process, used for recovery

**Caching:**
- JWK cache (in-memory Map) in `webhook/index.js` - Caches Plaid's webhook signing keys to avoid repeated fetches

## Authentication & Identity

**Bank Authentication (Plaid OAuth):**
- Service: Plaid Link web-based OAuth flow
  - Implementation: OAuth 2.0 redirect-based flow
  - Location: `link-account/server.js` orchestrates flow
  - Flow:
    1. Create link token via `/link_token/create`
    2. User authenticates with their bank in Plaid Link UI
    3. Bank redirects to `https://claudefinancetracker.xyz/oauth-callback`
    4. Callback page (`webhook/index.js` GET `/oauth-callback`) fetches link token from local server
    5. Plaid Link re-opens with `receivedRedirectUri`
    6. On success, post `public_token` back to local `/api/exchange`
    7. Server exchanges for `access_token` and stores in database

**Webhook Signature Verification:**
- Plaid signs every webhook with JWT in `Plaid-Verification` header
  - Verification: `jose` ^5.9.6 library
  - Process:
    1. Decode JWT header to extract key ID (kid)
    2. Fetch JWK from Plaid `/webhook_verification_key/get`
    3. Verify JWT signature with JWK
    4. Verify request body SHA-256 hash against JWT claim
    5. Reject if signature invalid or body tampered (see `webhook/index.js` `verifyPlaidWebhook()`)

**Database Authentication:**
- No user authentication (single-user personal project)
- All database access via `service_role` key (bypasses RLS)
- RLS policies restrict tables to service_role only
- Future: Add `user_id` column and auth.uid() filtering for multi-user support

## Monitoring & Observability

**Error Tracking:**
- None detected - errors logged to console

**Logs:**
- Console logging only
  - MCP server: errors to stderr
  - Webhook receiver: tagged logs ([webhook], [sync], etc.)
  - Link account: step-by-step progress logs

**Query Logging:**
- Database table `query_log` stores all executed queries via `insert_query_log()` RPC
  - Logged data: natural language query, SQL, success/error, execution time, tables referenced, query category
  - Location: Called from `mcp-server/tools.js` after every query execution

**Sync Audit Trail:**
- `sync_log` table records every Plaid sync event
  - Data: transactions added/modified/removed counts, cursor positions, timestamp
  - Enables recovery and debugging of sync state

## CI/CD & Deployment

**Hosting:**
- VPS deployment (DigitalOcean mentioned)
  - Webhook receiver runs as persistent service (PM2 mentioned for process management)
  - Custom domain: `claudefinancetracker.xyz`
  - HTTPS required (Plaid webhooks and OAuth redirects)

**CI Pipeline:**
- Not detected - no CI configuration files found

**Process Management:**
- PM2 mentioned in comments for webhook server uptime management (not configured in repo)

## Environment Configuration

**Required env vars:**

**Supabase (all services):**
- `SUPABASE_URL` - Project URL (format: `https://project-id.supabase.co`)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key

**Plaid (webhook and link-account services):**
- `PLAID_CLIENT_ID` - API client ID
- `PLAID_SECRET` - API secret
- `PLAID_ENV` - `sandbox` or `production`

**Express servers:**
- `PORT` - Optional, defaults to 3000 for webhook receiver

**Secrets location:**
- `.env` files (not committed, pattern in `.gitignore`)
- Webhook: `webhook/.env`
- Link account: `link-account/.env`
- MCP server: `mcp-server/.env`

## Webhooks & Callbacks

**Incoming (from Plaid):**
- `POST /webhook/plaid` (`webhook/index.js`)
  - Receives SYNC_UPDATES_AVAILABLE events when transaction data changes
  - Signature verified via JWT in `Plaid-Verification` header
  - Triggers background `/transactions/sync` call to fetch new/modified/removed transactions
  - Must respond with 200 within 10 seconds (Plaid requirement)

**Outgoing (to Plaid):**
- Webhook URL registered with Plaid: `https://claudefinancetracker.xyz/webhook/plaid`
- OAuth redirect URI: `https://claudefinancetracker.xyz/oauth-callback`

**Local callbacks:**
- OAuth callback page (`webhook/index.js` GET `/oauth-callback`) - Static HTML served to complete OAuth flow
- CORS allowed from `https://claudefinancetracker.xyz` to `http://localhost:8484` (link-account server)

## Data Flow Summary

**Initial Setup (link-account/server.js):**
1. Create link token → User authenticates with bank → Public token → Exchange for access token
2. Fetch institution metadata and accounts from Plaid
3. Upsert institution and accounts to Supabase
4. Fetch 2+ years of historical transactions via `/transactions/sync` with pagination
5. Upsert all transactions to Supabase
6. Store sync cursor for next incremental sync

**Ongoing Sync (webhook/index.js):**
1. Plaid sends SYNC_UPDATES_AVAILABLE webhook
2. Verify JWT signature and body hash
3. Fetch new/modified/removed transactions since last cursor
4. Update Supabase (insert/update/delete transactions, update account balances)
5. Save new cursor and log sync event

**Query (mcp-server/tools.js):**
1. Claude asks natural language question
2. MCP server calls `get_schema` to remind Claude of available tables
3. Claude generates SQL query
4. MCP server validates query (SELECT-only check)
5. Execute via `execute_sql()` RPC
6. Return results as JSON
7. Log query with metadata to `query_log` for analysis

---

*Integration audit: 2026-03-10*
