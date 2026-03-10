# Architecture

**Analysis Date:** 2026-03-10

## Pattern Overview

**Overall:** Distributed financial data pipeline with microservices for account linking, webhook ingestion, and AI-driven querying

**Key Characteristics:**
- One-time setup flow (link account) → continuous sync (webhooks) → read-only query access (MCP)
- Service-role-only database access for all backend services (security-first)
- Cursor-based pagination for reliable, resumable transaction syncing
- JWT signature verification for webhook security
- Read-only MCP tools for safe Claude integration

## Layers

**Frontend (Browser):**
- Purpose: User-facing UI for initiating Plaid Link, handling OAuth redirects, displaying connection status
- Location: `link-account/public/index.html`
- Contains: HTML UI, Plaid Link client integration, JavaScript handler for token exchange
- Depends on: Plaid SDK (CDN), local Express server for link token and token exchange
- Used by: User during one-time account setup

**Account Linking Service (Express):**
- Purpose: One-time setup flow that opens Plaid Link locally, exchanges tokens, and seeds Supabase with initial data
- Location: `link-account/server.js`
- Contains: Link token creation, public_token → access_token exchange, institution/account/transaction insertion, recovery mechanism
- Depends on: Plaid API, Supabase (service_role), environment config
- Used by: User during initial setup; self-terminates after first successful sync

**Webhook Receiver (Express):**
- Purpose: Receive Plaid transaction sync webhooks and persist changes to Supabase in real-time
- Location: `webhook/index.js`
- Contains: Webhook signature verification (JWT + SHA-256), transaction/account sync logic, cursor management, sync logging
- Depends on: Plaid API, Supabase (service_role), jose for JWT verification
- Used by: Plaid (external service) on every SYNC_UPDATES_AVAILABLE event

**MCP Server (Model Context Protocol):**
- Purpose: Expose financial database to Claude via two secure, read-only tools (get_schema, execute_query)
- Location: `mcp-server/index.js`, `mcp-server/server-http.js`, `mcp-server/tools.js`
- Contains: MCP tool registration, SQL validation, query logging, schema introspection
- Depends on: Supabase (service_role), MCP SDK, Zod for validation
- Used by: Claude Desktop (stdio) or HTTP clients (remote access)

**Database Layer (Supabase PostgreSQL):**
- Purpose: Single source of truth for institutions, accounts, transactions, and query audit trail
- Contains: Five core tables (institutions, accounts, transactions, sync_log, query_log), RPC functions for schema/query execution
- Security: RLS disabled; all access through service_role key
- Accessed by: All backend services via Supabase client

## Data Flow

**Flow 1: One-Time Account Setup**

1. User opens local Express server (`link-account/server.js`)
2. Frontend fetches link token from `/api/link-token`
3. Plaid Link modal opens; user authenticates with bank
4. Bank redirects to `https://claudefinancetracker.xyz/oauth-callback`
5. OAuth callback page fetches link_token from local server and resumes Plaid Link
6. Plaid returns public_token to frontend; frontend POSTs to `/api/exchange`
7. Server exchanges public_token for access_token with Plaid
8. Server saves access_token to `.recovery.json` (safety: can retry from here)
9. Server inserts institution record into Supabase with access_token
10. Server fetches accounts via Plaid, inserts into Supabase with foreign key to institution
11. Server syncs historical transactions via `/transactions/sync` (pagination loop), inserts with cursor tracking
12. Server updates sync_log with totals
13. Server verifies counts and shuts down
14. User sees success message with institution/account/transaction counts

**Flow 2: Continuous Transaction Sync**

1. Plaid detects changes to a linked account (new/modified/removed transactions)
2. Plaid sends SYNC_UPDATES_AVAILABLE webhook to `https://claudefinancetracker.xyz/webhook/plaid`
3. Webhook receiver verifies JWT signature (kid lookup → public key fetch → signature verification)
4. Receiver verifies SHA-256 hash of raw request body against JWT claim
5. Receiver responds with 200 immediately (Plaid requires <10s response)
6. Receiver performs sync in background: fetches from Plaid using cursor, processes pages (added/modified/removed)
7. For each transaction change, maps Plaid format to Supabase schema (resolving plaid_account_id → UUID)
8. Upserts transactions (onConflict = update if duplicate webhook)
9. Updates account balances from sync response
10. Persists new cursor to institutions.sync_cursor
11. Logs sync event to sync_log table
12. Natural re-entrancy: can restart from last cursor if process crashes

**Flow 3: AI-Driven Financial Query**

1. Claude calls MCP server tool: `get_schema`
2. Server executes RPC `get_schema_info()`, returns table names, columns, data types, FKs
3. Claude writes SQL SELECT query based on user question
4. Claude calls MCP server tool: `execute_query(sql, natural_language_query)`
5. Server validates: must be SELECT only, no dangerous keywords, no semicolons
6. Server executes RPC `execute_sql(query_text)` via Supabase
7. Server logs query to query_log: timestamp, user question, SQL, success/error, row count, tables touched, category
8. Server returns results as JSON
9. Claude interprets results and answers user's question

**State Management:**

- **Sync Cursor:** Tracked in `institutions.sync_cursor`. Plaid tracks changes server-side; we resume from last cursor. Handles gaps if webhook receiver is down.
- **Account Balances:** Updated on every sync response (includes fresh balance data from Plaid). Historical balances stored via transaction metadata only.
- **Query Audit:** Every MCP query logged to `query_log` regardless of success/failure. Enables debugging and usage analysis.
- **Recovery:** `.recovery.json` in link-account/ stores access_token after successful exchange, before downstream steps. Allows `/api/recover` endpoint to retry if setup fails mid-sync.

## Key Abstractions

**Plaid Transaction Mapping:**
- Purpose: Normalize Plaid transaction format to Supabase schema
- Examples: `link-account/server.js` line 76–96, `webhook/index.js` line 238–258
- Pattern: Map function resolves plaid_account_id to UUID via account map, flattens personal_finance_category, defaults currency to USD, includes raw_data for debugging

**Webhook Verification (JWT + Hash):**
- Purpose: Cryptographically prove webhook came from Plaid, not a forged request
- Examples: `webhook/index.js` line 84–126
- Pattern: Decode JWT header to extract kid, fetch public key from Plaid (cached), import JWK, verify signature, compute SHA-256 of raw body, compare to JWT claim

**SQL Validation & Logging:**
- Purpose: Prevent injection attacks and track query usage
- Examples: `mcp-server/tools.js` line 28–133
- Pattern: Strip comments, check for SELECT-only, reject forbidden keywords, log all queries (success/error/category) to query_log RPC

**Cursor-Based Pagination:**
- Purpose: Reliably sync large transaction datasets with resumable checkpoints
- Examples: `link-account/server.js` line 228–283, `webhook/index.js` line 160–195
- Pattern: Request page with cursor, update cursor after each page, loop until has_more = false, persist cursor before next sync

## Entry Points

**Link Account Setup:**
- Location: `link-account/server.js`
- Triggers: `npm start` in link-account/
- Responsibilities: Listen on port 8484, serve Plaid Link UI, handle token exchange, seed database, auto-shutdown on success

**Webhook Receiver:**
- Location: `webhook/index.js`
- Triggers: Plaid webhook POSTs to `/webhook/plaid` (external)
- Responsibilities: Verify webhook, respond immediately, sync transactions in background, maintain cursor and audit trail

**MCP Server (Stdio):**
- Location: `mcp-server/index.js`
- Triggers: Run as subprocess by Claude Desktop
- Responsibilities: Initialize stdio transport, connect MCP server, listen for tool calls from Claude

**MCP Server (HTTP):**
- Location: `mcp-server/server-http.js`
- Triggers: `npm run start:http` in mcp-server/
- Responsibilities: Listen on port 3001, manage session state, handle JSON-RPC, SSE streaming, session cleanup

## Error Handling

**Strategy:** Fail fast on startup (env validation), log errors to console/database, respond gracefully to API clients

**Patterns:**

- **Env Validation:** All three services validate required env vars at startup and exit(1) if missing. Prevents silent misconfiguration.
  - Example: `link-account/server.js` line 22–45, `webhook/index.js` line 21–44

- **Plaid API Errors:** Try/catch around Plaid client calls. Log error and respond with error message. Include recovery mechanism (`.recovery.json`) for link-account.
  - Example: `link-account/server.js` line 343–364

- **Database Errors:** Upsert with onConflict for transactions (duplicate webhooks handled), individual error logging for each operation, continue processing other records.
  - Example: `webhook/index.js` line 263–279

- **Webhook Verification Failures:** Return 401 immediately. Log error. Do not process sync.
  - Example: `webhook/index.js` line 375–380

- **Query Validation Failures:** Return error message, log rejection reason, do not execute against database.
  - Example: `mcp-server/tools.js` line 186–202

## Cross-Cutting Concerns

**Logging:**
- All services log to stdout (captured by PM2 or Docker)
- Link-account logs setup steps with "SUCCESS:", "Step N:" prefixes for clarity
- Webhook logs with "[webhook]", "[sync]" prefixes for debugging
- MCP logs with "[mcp]" prefixes
- No sensitive data in logs (tokens stored in env vars only)

**Validation:**
- Environment variables validated at startup
- SQL queries validated before execution (SELECT-only, no keywords, no semicolons)
- Plaid webhook signatures verified cryptographically
- Request body SHA-256 verified against JWT claim

**Authentication:**
- All Supabase access uses service_role key (no anon/authenticated roles)
- Plaid API authenticated via client ID + secret (passed in headers)
- Webhook signature verified via JWT (Plaid public key)
- MCP HTTP server is authless (HTTPS provides transport security at deployment)

**Rate Limiting:**
- Not explicitly implemented in code; relies on Plaid rate limits and database connection pool

---

*Architecture analysis: 2026-03-10*
