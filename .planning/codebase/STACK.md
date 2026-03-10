# Technology Stack

**Analysis Date:** 2026-03-10

## Languages

**Primary:**
- JavaScript (ES6+) - All server-side code, including MCP server, webhook receiver, and account linking flows

**Secondary:**
- SQL (PostgreSQL) - Database schema, migrations, and RPC functions in Supabase

## Runtime

**Environment:**
- Node.js (version not explicitly pinned in package.json, latest LTS assumed)

**Package Manager:**
- npm - Used across all three services
- Lockfile: `package-lock.json` present in `mcp-server/` and `webhook/`

## Frameworks

**Core:**
- Express.js ^4.21.2 - HTTP server for webhook receiver (`webhook/`) and account linking setup (`link-account/`)
- Model Context Protocol (MCP) SDK ^1.12.1 (`@modelcontextprotocol/sdk`) - Server implementation for Claude integration in `mcp-server/`

**Database:**
- Supabase JavaScript Client ^2.49.4 (`@supabase/supabase-js`) - Used across all services for database access
- PostgreSQL - Underlying database, hosted on Supabase

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` ^2.49.4 - Database and API client (Supabase)
- `plaid` ^28.0.0 - Plaid API client for bank connections, account fetching, and transaction sync
- `@modelcontextprotocol/sdk` ^1.12.1 - MCP server protocol for Claude Desktop integration
- `express` ^4.21.2 - HTTP framework

**Infrastructure:**
- `dotenv` ^16.4.7 - Environment variable loading (all three services)
- `jose` ^5.9.6 - JWT verification and JWK handling for Plaid webhook signature validation (`webhook/`)
- `zod` - Schema validation (used in `mcp-server/` tools for input validation)

## Configuration

**Environment:**
- `.env` files per service (examples provided as `.env.example`)
- Environment variables loaded via `dotenv/config` on startup
- All three services validate required env vars on startup and fail fast with descriptive errors

**Critical env vars:**
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (bypasses RLS, used by servers)
- `PLAID_CLIENT_ID` - Plaid API client ID
- `PLAID_SECRET` - Plaid API secret
- `PLAID_ENV` - Environment setting (sandbox/production)
- `PORT` - Express server port (webhook receiver, defaults to 3000)

**Build:**
- No build step required - all code runs as-is via Node.js
- Scripts defined in package.json:
  - `mcp-server/`: `npm start` (stdio transport for Claude Desktop), `npm start:http` (HTTP transport)
  - `webhook/`: `npm start`
  - `link-account/`: `npm start`

## Platform Requirements

**Development:**
- Node.js installed locally
- npm for dependency management
- `.env` file populated with credentials (Supabase URL, keys; Plaid credentials)
- Supabase project created with migration schema applied

**Production:**
- Deployment target: VPS (DigitalOcean mentioned in code comments)
- Webhook receiver (`webhook/`) runs as persistent background service (PM2 mentioned)
- MCP server runs locally via Claude Desktop stdio transport
- Link account setup runs locally as one-time setup script

**Deployment considerations:**
- Webhook receiver must be accessible via public HTTPS URL registered with Plaid
- OAuth callback redirect URI configured: `https://claudefinancetracker.xyz/oauth-callback`
- Webhook URL configured: `https://claudefinancetracker.xyz/webhook/plaid`
- Local link-account server communicates with VPS OAuth callback via CORS

## Network & Security

**Integrations:**
- Plaid API - HTTP client configured with client ID and secret in headers
- Supabase - REST client with service role key for authentication
- Claude Desktop - MCP over stdio

**Secrets Management:**
- Service role key never exposed in client-side code
- Plaid webhook signatures verified via JWT + SHA-256 hash validation
- All credentials passed via environment variables only
- `.env` files excluded from git via `.gitignore`

---

*Stack analysis: 2026-03-10*
