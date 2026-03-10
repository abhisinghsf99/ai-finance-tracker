# Codebase Structure

**Analysis Date:** 2026-03-10

## Directory Layout

```
AI Finance Tracker/
├── link-account/             # One-time account linking UI + server
│   ├── server.js              # Express app: token exchange, setup, recovery
│   ├── public/
│   │   └── index.html         # Plaid Link UI + token exchange client
│   ├── .env                   # (secrets: SUPABASE_*, PLAID_*)
│   ├── .recovery.json         # Transient: access_token backup during setup
│   └── package.json
│
├── webhook/                   # Plaid webhook receiver for continuous sync
│   ├── index.js               # Express app: signature verification, transaction sync
│   ├── .env.example           # Template for webhook env vars
│   └── package.json
│
├── mcp-server/                # MCP server: expose financial data to Claude
│   ├── index.js               # Stdio transport (for Claude Desktop)
│   ├── server-http.js         # HTTP transport (for remote access)
│   ├── tools.js               # MCP tool definitions: get_schema, execute_query
│   ├── setup.sql              # RPC functions: get_schema_info, execute_sql
│   ├── query-log-migration.sql # Schema migration for query_log table
│   ├── .env                   # (secrets: SUPABASE_*)
│   ├── .env.example           # Template for MCP env vars
│   └── package.json
│
├── .planning/
│   └── codebase/              # Generated analysis documents
│       ├── ARCHITECTURE.md
│       └── STRUCTURE.md
│
├── .claude/                   # Claude automation config
│   ├── agents/
│   ├── commands/
│   ├── get-shit-done/         # GSD (Get Shit Done) framework configs
│   ├── hooks/
│   └── skills/
│
├── BEST_PRACTICES.md          # Development guidelines
├── SETUP-GUIDE.md             # Deployment and configuration instructions
├── financial-assistant-project-plan.md  # Project goals and roadmap
├── obsidian-note-saver-SKILL.md         # Integration skill documentation
└── supabase-migration.sql     # Initial schema/RLS setup

```

## Directory Purposes

**link-account/:**
- Purpose: One-time account setup. User runs this locally to open Plaid Link, authenticate with their bank, and import initial transactions.
- Contains: Express server, Plaid Link UI, token exchange logic, database seeding
- Key files: `server.js` (entry point), `public/index.html` (frontend)
- Runs on: Port 8484 (localhost during setup)

**webhook/:**
- Purpose: Long-running service that receives Plaid webhooks and syncs transactions continuously.
- Contains: Express server, webhook signature verification, transaction sync logic, cursor management
- Key files: `index.js` (entry point)
- Runs on: Configurable port (default 3000), deployed to VPS

**mcp-server/:**
- Purpose: Expose financial database to Claude via Model Context Protocol. Two transport options: stdio (local Claude Desktop) or HTTP (remote).
- Contains: MCP server implementation, tool definitions, SQL validation, query logging
- Key files: `index.js` (stdio), `server-http.js` (HTTP), `tools.js` (tool definitions)
- Runs on: Stdio (subprocess) or port 3001 (HTTP)

**.planning/codebase/:**
- Purpose: Generated analysis documents for future GSD phases
- Contains: Architecture, structure, testing, conventions, and concerns documents
- Auto-generated: Yes (via `/gsd:map-codebase` command)

**.claude/:**
- Purpose: Claude automation configs (GSD framework, skills, commands, hooks)
- Contains: Orchestration templates, custom skills, pre/post-commit hooks
- Auto-generated: Partially (some files hand-written, some by GSD)

## Key File Locations

**Entry Points:**

- `link-account/server.js`: One-time setup server. Run with `npm start` in link-account/.
- `webhook/index.js`: Webhook receiver. Run with `npm start` in webhook/.
- `mcp-server/index.js`: MCP stdio server. Started by Claude Desktop or manually.
- `mcp-server/server-http.js`: MCP HTTP server. Run with `npm run start:http` in mcp-server/.

**Configuration:**

- `link-account/.env`: Supabase + Plaid credentials for setup
- `webhook/.env.example`: Template for webhook env vars
- `mcp-server/.env`: Supabase credentials for MCP queries
- `mcp-server/.env.example`: Template for MCP env vars
- `.planning/codebase/`: Generated documentation (ARCHITECTURE.md, STRUCTURE.md, etc.)

**Core Logic:**

- `link-account/server.js` (lines 76–96): Plaid transaction mapping function
- `link-account/server.js` (lines 165–337): Setup flow with recovery mechanism
- `webhook/index.js` (lines 84–126): Webhook JWT verification logic
- `webhook/index.js` (lines 135–216): Transaction sync with cursor pagination
- `mcp-server/tools.js` (lines 28–133): SQL validation and logging
- `mcp-server/tools.js` (lines 137–254): MCP tool definitions

**Database:**

- `mcp-server/setup.sql`: Create RPC functions (get_schema_info, execute_sql) + grant permissions
- `mcp-server/query-log-migration.sql`: Create query_log table
- `supabase-migration.sql` (project root): Initial schema for institutions, accounts, transactions, sync_log

**Frontend:**

- `link-account/public/index.html`: Plaid Link UI, token exchange, status display
- `webhook/index.js` (lines 399–506): OAuth callback HTML (embedded in response)

**Testing & Documentation:**

- `BEST_PRACTICES.md`: Development guidelines for the project
- `SETUP-GUIDE.md`: Deployment, env var setup, PostgreSQL migrations
- `financial-assistant-project-plan.md`: Project vision, phases, and goals

## Naming Conventions

**Files:**

- Entry points: `index.js` or `server.js`
- Helpers: `tools.js`, `setup.sql`
- Configuration: `.env`, `.env.example`
- Documentation: `*.md`
- Transient data: `.recovery.json`

**Directories:**

- Feature directories: kebab-case (e.g., `link-account`, `mcp-server`)
- Config directories: dot-prefix (e.g., `.claude`, `.planning`)
- Public assets: `public/`

**Functions:**

- Async database operations: `getAccountMap`, `insertTransactions`, `updateAccountBalances` (camelCase)
- Sync helpers: `mapTransaction`, `validateQuery`, `formatSchema` (camelCase)
- Express routes: `app.get('/path')`, `app.post('/api/endpoint')` (kebab-case paths)

**Variables:**

- Constants: `SUPABASE_URL`, `PORT`, `RECOVERY_FILE` (SCREAMING_SNAKE_CASE)
- Objects: `supabase`, `plaidClient`, `jwkCache` (camelCase)
- Maps/Collections: `accountMap`, `transports`, `tables` (camelCase)

**Types & Schema:**

- Database tables: `institutions`, `accounts`, `transactions`, `sync_log`, `query_log` (snake_case)
- JSON keys in API responses: snake_case (e.g., `institution_name`, `access_token`, `sync_cursor`)
- RPC function names: snake_case (e.g., `get_schema_info`, `execute_sql`, `insert_query_log`)

## Where to Add New Code

**New Feature (e.g., "Add scheduled sync manager"):**
- Primary code: `mcp-server/scheduled-sync.js` (if MCP-integrated) or `webhook/scheduled-sync.js` (if webhook-integrated)
- Configuration: Add env vars to relevant `.env` template
- Tests: Create `mcp-server/scheduled-sync.test.js` if testing implemented
- Documentation: Update `.planning/codebase/ARCHITECTURE.md` and project plan

**New Tool for Claude (e.g., "Forecast spending"):**
- Implementation: Add to `mcp-server/tools.js` via `server.registerTool()`
- SQL helpers: Add RPC function to `mcp-server/setup.sql`
- Validation: Use Zod schema for input validation (pattern in tools.js)
- Logging: Add category to `classifyQuery()` function (line 98–113)

**New Transaction Processing Step (e.g., "Tag transactions with ML categories"):**
- In link-account: Add to `runSetup()` function after transaction insert (around line 246–279)
- In webhook: Add to `processSync()` function after transaction update (around line 172–191)
- Pattern: Same operation in both places to ensure one-time setup and continuous sync stay in sync

**New Database Table:**
- Schema: Add to `supabase-migration.sql` or `mcp-server/setup.sql`
- Migration: Create versioned `.sql` file (e.g., `mcp-server/migration-2026-03-10.sql`)
- Access: Add table name to `KNOWN_TABLES` constant (line 91 in tools.js) for query logging
- RLS: Disable (project uses service_role only)

**New Route in Link Account (e.g., "GET /api/status"):**
- Add to `link-account/server.js` alongside other routes (around line 130–157)
- Pattern: Follow existing route structure with try/catch and console logging
- Shutdown: Avoid starting new async work after `/api/exchange` succeeds (server shuts down)

**New Route in Webhook (e.g., "POST /api/manual-sync"):**
- Add to `webhook/index.js` alongside existing routes (around line 356–392)
- Pattern: No signature verification for non-webhook routes; respond immediately and process in background if long-running
- Logging: Prefix console logs with `[route-name]` for consistency

**Utilities:**
- Shared helpers: Create in new file (e.g., `lib/crypto.js`) and import into both link-account and webhook
- Database abstractions: Keep in respective service (link-account/server.js, webhook/index.js) or move to shared module if used by multiple services

## Special Directories

**link-account/.recovery.json:**
- Purpose: Transient backup of access_token after successful Plaid exchange, before downstream database steps
- Generated: On `/api/exchange` (line 356 in server.js)
- Committed: No (should be .gitignored)
- Lifecycle: Persists in case setup fails; user can call `/api/recover` to retry. Deleted when setup completes and server shuts down.

**webhook/.env.example:**
- Purpose: Template showing required env vars
- Committed: Yes (secrets like PLAID_SECRET are not included)
- Usage: Copy to `.env` and fill in values before deployment

**mcp-server/.env.example:**
- Purpose: Template showing MCP-specific env vars
- Committed: Yes
- Usage: Copy to `.env` and fill in values before deployment

**mcp-server/node_modules:**
- Purpose: Dependencies (Express, Supabase, MCP SDK, Zod, jose)
- Committed: No (package-lock.json is committed for reproducibility)
- Install: `npm install` in mcp-server/

**.planning/codebase/:**
- Purpose: Analysis documents generated by `/gsd:map-codebase` command
- Generated: Yes (by Claude mapper agents)
- Committed: Yes (intended as persistent reference for GSD phases)
- Update frequency: On-demand when codebase architecture significantly changes

---

*Structure analysis: 2026-03-10*
