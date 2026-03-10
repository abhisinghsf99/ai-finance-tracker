# Coding Conventions

**Analysis Date:** 2026-03-10

## Naming Patterns

**Files:**
- JavaScript/Node.js files: lowercase with hyphens (e.g., `server.js`, `server-http.js`)
- No strict file naming conventions for backend modules — descriptive names that match purpose
- Pattern: `index.js` for entry points, feature files named by function (e.g., `tools.js` for MCP tools)

**Functions:**
- camelCase for all function and variable names
- Example from `mcp-server/tools.js`: `createMcpServer()`, `validateQuery()`, `formatSchema()`, `extractTables()`, `classifyQuery()`, `logQuery()`

**Variables:**
- camelCase for local variables and parameters
- CONSTANT_CASE for module-level constants (e.g., `FORBIDDEN_PATTERN`, `KNOWN_TABLES`)
- Example from `webhook/index.js`: `jwkCache`, `itemId`, `syncRequest`, `totalAdded`

**Types:**
- Object types use camelCase field names, not enforced through explicit interfaces (uses Zod for validation instead)
- Example from `mcp-server/tools.js`: Zod schemas define input shapes with `z.object()` and `z.string()`
- No TypeScript usage in backend modules — plain JavaScript with runtime Zod validation

## Code Style

**Formatting:**
- No linter or formatter detected — code appears hand-formatted
- 2-space indentation observed throughout
- Line length varies, no strict column limit enforced

**Linting:**
- No .eslintrc or ESLint configuration found at project root
- Dependencies may include individual linters but not globally configured

## Import Organization

**Order:**
1. Node.js built-ins (`dotenv/config`, `crypto`, `child_process`, `fs`, `path`)
2. External packages (`express`, `jose`, `plaid`, `@supabase/supabase-js`, `@modelcontextprotocol/sdk`)
3. Local modules (none in current backend modules)

**Path Aliases:**
- No path aliases configured — direct relative/absolute paths used
- Pattern: Direct imports like `import { createMcpServer } from "./tools.js";`

## Error Handling

**Patterns:**
- **Fail-fast on startup:** Environment validation at top of files with immediate `process.exit(1)` if missing variables
  - Example from `webhook/index.js`: Lines 21-44 check for required env vars and crash if any missing
  - Example from `link-account/server.js`: Lines 22-45 same pattern
- **Try-catch with logging:** Errors logged to console with context, then rethrown or handled
  - Example from `webhook/index.js` line 375-380: Webhook verification errors logged and returned as 401
- **Async error handling:** Promise-based operations use `.catch()` for background tasks
  - Example from `mcp-server/tools.js` line 116-132: Query logging wrapped in `.then().catch()`
- **Route handlers:** Return `NextResponse.json({ error })` with appropriate HTTP status codes (400, 401, 500)
  - Example from `webhook/index.js` line 379-380: Returns 401 JSON on verification failure

## Logging

**Framework:** `console.error()`, `console.log()` — no logging library

**Patterns:**
- **Prefixed log messages:** Square bracket prefix for context, e.g. `[sync]`, `[webhook]`, `[mcp]`, `[sync]`
- Example from `webhook/index.js`: `console.log(`[sync] Starting sync for item_id: ${itemId}`)` (line 136)
- **Error logging:** Includes context and message: `console.error("[sync] Institution not found for item_id ${itemId}:", lookupError?.message);` (line 147)
- **Multi-step operations:** Log at each step for visibility
  - Example from `link-account/server.js`: Lines 167-325 log "Step 1", "Step 2", etc. with SUCCESS/ERROR indicators

## Comments

**When to Comment:**
- Section dividers: Heavy use of banner comments with `==========` dividers marking logical sections
- Purpose clarifications: Comments above complex logic blocks explaining the "why"
- Example from `webhook/index.js` lines 68-78: 47-line comment block explaining Plaid webhook signature verification steps

**JSDoc/TSDoc:**
- Not used in current codebase — no function documentation comments
- Code is self-documenting through clear function names and inline section comments

## Function Design

**Size:** Functions range from 1-50 lines, with most between 5-20 lines. No strict size limit enforced.

**Parameters:**
- Simple functions take 1-3 parameters
- Complex operations use object destructuring for named parameters
- Example from `mcp-server/tools.js` line 137: `createMcpServer()` takes no parameters but returns configured server

**Return Values:**
- Async functions return Promises with resolved values or errors
- Database operations return objects with `{ data, error }` pattern from Supabase SDK
- MCP tools return objects with `{ content: [...], isError?: true }`

## Module Design

**Exports:**
- Export single function per module: `export function createMcpServer() { ... }`
- Named exports preferred over default: `export function`, `export const`

**Barrel Files:**
- Not used — each file exports only what it defines

## Next.js Conventions (from BEST_PRACTICES.md)

When working with Next.js frontend:

**TypeScript:**
- Use `type` for everything, reserve `interface` for extension
- Inline simple prop types, extract complex/reused types
- Server Components by default, mark client components with `"use client"` explicitly

**File Organization:**
- Route files (`page.tsx`, `layout.tsx`) contain zero business logic, only composition
- Use route groups like `(auth)` and `(dashboard)` for shared layouts
- Co-locate feature components in `components/features/[feature]/`
- Keep `lib/` for clients/pure functions, `hooks/` for React hooks

**Data Fetching:**
- Server Components for reads
- Route handlers for mutations and external API calls
- Client-side fetching only for real-time or user-driven updates

**State Management:**
- Zustand for global client state (not Redux, Jotai)
- Server Components own server state
- URL searchParams are state too for shareable/bookmarkable filters

**Styling:**
- Tailwind CSS with CSS variables as design tokens
- Never hardcode colors — use semantic tokens (`bg-card`, `text-foreground`)
- Use `cn()` utility (clsx + tailwind-merge) for conditional classes

---

*Convention analysis: 2026-03-10*
