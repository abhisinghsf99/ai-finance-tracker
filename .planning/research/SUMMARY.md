# Project Research Summary

**Project:** FinTrack Frontend Dashboard
**Domain:** Personal fintech dashboard (read-only visualization + AI chat over Plaid-backed Supabase data)
**Researched:** 2026-03-10
**Confidence:** HIGH

## Executive Summary

This is a personal finance dashboard built as a read-only Next.js frontend layer over an existing Supabase + Plaid backend. The backend (webhook sync, MCP server, bank linking) is already operational — the entire build is a frontend project. The recommended approach is Next.js 15.5.x with React Server Components as the primary data-fetching strategy, shadcn/ui + Recharts for the UI, and the Vercel AI SDK v6 with Anthropic's `mcp_servers` parameter for the chat interface. The app has one user, so authentication is a simple middleware password gate rather than a full auth system. The natural language chat feature — where Claude queries financial data via the existing remote MCP server — is the clear differentiator that no commercial finance app offers.

The recommended build order follows architectural dependencies: project scaffolding and auth first, then the dashboard and transaction pages (which prove the data access pattern), then recurring charge detection, and finally the chat interface. Server Components handle all Supabase queries server-side using the `service_role` key; Client Components handle only interactivity (chart tooltips, filter inputs, chat streaming). This clean boundary eliminates the need for state management libraries and keeps financial data off the client bundle.

The dominant risks are security-related (service role key exposure, weak auth validation) and operational (Vercel timeout on the chat API route, Plaid amount sign convention confusion causing wrong totals). All of these have clear mitigations documented in research and must be addressed at the phase where they first appear, not retrofitted later.

## Key Findings

### Recommended Stack

The stack is tightly constrained by the existing backend: Supabase is locked in, Anthropic is locked in, and the remote MCP server at `claudefinancetracker.xyz/mcp` is already built. The frontend choices optimize for compatibility with this foundation. Next.js 15.5.x (not 14, which is near EOL; not 16, which has unsettled breaking changes) is the framework choice. shadcn/ui CLI v4 with Tailwind 4 handles the component system — notably, the new CLI consolidates radix-ui into a single dependency. Recharts 3.8.x is the charting library, accessed through shadcn's Chart component wrapper which provides 53 variants with automatic dark/light mode. The Vercel AI SDK v6 with `useChat` hook eliminates ~60% of chat UI boilerplate versus using the raw Anthropic SDK directly.

See `.planning/research/STACK.md` for version compatibility matrix, installation commands, and environment variable setup.

**Core technologies:**
- Next.js 15.5.x: full-stack framework — stable production-proven version between EOL v14 and unsettled v16
- React 19.x: UI library — required by Next.js 15, fully supported by shadcn/ui CLI v4
- TypeScript 5.x: type safety — non-negotiable for financial amount handling; catches sign errors at compile time
- shadcn/ui (CLI v4): component library — accessible, Tailwind-native, dark mode built-in, owned not packaged
- Recharts 3.8.x (via shadcn Chart): data visualization — 53 chart variants, automatic theme support, no second library needed
- @supabase/ssr 0.9.x: Supabase Next.js client — required for App Router cookie-based sessions; replaces deprecated auth-helpers
- Vercel AI SDK 6.x + @ai-sdk/anthropic: chat infrastructure — `useChat` hook + `streamText()` handles streaming, message state, and MCP tool calls
- Next.js Middleware (built-in): password gate auth — ~50 lines, no third-party auth service needed for single-user app

### Expected Features

The feature landscape is well-established (Copilot, Monarch, Lunch Money, Mint are the reference implementations) with one unique differentiator: natural language chat backed by Claude + MCP. Research clearly separates what users expect universally from what sets this app apart, and explicitly lists what to defer.

See `.planning/research/FEATURES.md` for full feature dependency graph and build priority ordering.

**Must have (table stakes):**
- Account balances overview — first thing every finance app user looks for
- Net worth / net position card — assets minus liabilities; universal in modern finance apps
- Credit utilization display — balance vs. limit as progress bar for credit accounts
- Monthly spending total with month-over-month comparison — the most common financial question answered instantly
- Spending by category breakdown — donut/pie chart; universally expected, Plaid provides categories automatically
- Monthly spending trend chart — trailing 6 months bar chart showing trajectory not just snapshot
- Transaction list with search and filters — full-text search on merchant name, filter by date/category/account/amount
- Recent transactions on dashboard — last 15 transactions for quick "what just happened" awareness
- Dark mode — fintech dashboard convention; financial data reads better on dark backgrounds
- Responsive mobile layout — users check finances on phones; non-negotiable
- Auth protection — financial data on a public URL without auth is a dealbreaker

**Should have (differentiators):**
- Natural language chat for financial queries — the killer feature; no other personal finance app lets you ask arbitrary SQL-backed questions via Claude
- Recurring charge detection and display — custom SQL detection logic (no Plaid paid add-on needed); monthly subscription total gives immediate cost awareness
- Suggestion chips on empty chat state — pre-populated query ideas lower barrier to chat usage
- Merchant logo display — Plaid provides `logo_url`; makes transaction lists scannable
- Income vs. spending visualization — cash flow perspective beyond just expenses

**Defer (Phase 2+):**
- Push notifications and anomaly detection — Phase 2 scope; requires service worker and baseline transaction history
- Custom category taxonomy and category management — Phase 2; requires write path
- Budget setting and goal tracking — Phase 3; requires write operations and new UX
- Data export (CSV/PDF) — Phase 3; chat answers analytical questions on demand
- Investment tracking, multi-currency, real-time streaming — out of scope entirely

### Architecture Approach

The architecture is a Server Component-first Next.js app where data fetching happens entirely server-side via Supabase service role key, Client Components receive data as props and handle only interactivity. URL search params drive filter state (no client-side state library needed). The chat flow is: Client Component `useChat` hook → `/api/chat` Route Handler → Anthropic SDK with `mcp_servers` parameter → Claude calls the remote MCP server automatically → streams response back. Auth is handled by middleware running on Vercel Edge, checking an HTTP-only cookie on every request.

See `.planning/research/ARCHITECTURE.md` for full component boundary table, data flow diagrams, code patterns, and file structure.

**Major components:**
1. Auth Middleware — Edge function that checks session cookie on every request; redirects to `/login` if missing
2. Layout Shell — Sidebar navigation + theme provider; wraps all pages; mix of Server and Client
3. Dashboard Page (Server Component) — parallel Supabase queries for balances, spending totals, category breakdown, recent transactions; passes data as props to Client Component charts
4. Dashboard Charts (Client Components) — Recharts rendering with tooltips/hover; receives data as props; wrapped in `React.memo()`
5. Transactions Page (Server Component) — reads URL search params, runs filtered/paginated Supabase queries server-side
6. Transaction Filters (Client Component) — updates URL search params; triggers Server Component re-render
7. Recurring Page (Server Component) — aggregation query for merchant detection; no client interactivity needed
8. Chat Page (Client Component) — `useChat` hook, message history, streaming display, suggestion chips
9. Chat API Route Handler — Anthropic SDK with `mcp_servers` parameter; Edge runtime to avoid 10s timeout; streams ReadableStream back
10. Supabase Server Utility (`lib/supabase/server.ts`) — single factory function for service role client; used by all Server Components

### Critical Pitfalls

See `.planning/research/PITFALLS.md` for full prevention strategies, detection methods, and phase-specific warnings for all 14 identified pitfalls.

1. **Service role key exposed to browser** — Never use `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`; service role key is server-only env var, accessed only in Server Components and Route Handlers. Must be correct from day 1 of scaffolding.
2. **Plaid amount sign convention confusion** — Plaid: positive = spending, negative = income/refunds. Establish a `displayAmount()` utility and filtering convention (`amount > 0` for spending queries) before writing any chart code. Wrong convention causes incorrect totals across the entire dashboard.
3. **Pending transaction double-counting** — Always filter `WHERE is_pending = false` for summary and chart queries. Show pending separately with a badge. Inflated totals destroy user trust.
4. **Vercel chat API timeout** — Use Edge runtime (`export const runtime = 'edge'`) on the `/api/chat` route to get streaming timeout instead of 10s function limit. Add schema to system prompt to eliminate `get_schema` MCP round trip.
5. **Server/client component boundary confusion** — Page files (`page.tsx`) must never have `"use client"`. Server Components fetch data; Client Components render interactivity. Establish this pattern in scaffolding and never deviate.

## Implications for Roadmap

Based on the combined research, a 4-phase structure maps cleanly to the dependency chain and risk profile of this project.

### Phase 1: Foundation and Auth

**Rationale:** Nothing else can be built until the project is initialized, Supabase server client is correctly set up, and auth is in place. The two most critical security pitfalls (service role key exposure, weak auth) both manifest here. Getting this right once is easier than retrofitting.

**Delivers:** A working Next.js 15 project deployed to Vercel with password-protected routes, correct Supabase client architecture (server-only service role key), and a responsive layout shell with dark mode support.

**Addresses:** Auth protection (table stakes), dark mode (table stakes), responsive layout foundation.

**Avoids:** Pitfall 1 (service role key leak), Pitfall 2 (auth validation weakness), Pitfall 7 (server/client boundary confusion), Pitfall 9 (missing @supabase/ssr).

**Stack elements:** Next.js 15 scaffolding, shadcn/ui init, @supabase/ssr, Next.js Middleware auth gate.

### Phase 2: Dashboard and Transactions

**Rationale:** The dashboard is the highest user-value surface and proves the entire data access pattern works end-to-end. Once Server Component data loading is proven on the dashboard, the transactions page reuses the same patterns. All Plaid data conventions (amount signs, pending status, null merchants) must be established in this phase.

**Delivers:** A fully functional dashboard with account balances, net position, credit utilization, monthly spending comparison, category donut chart, 6-month trend chart, and recent transactions. Plus a complete transaction browser with search, filters (URL-driven), and pagination.

**Addresses:** Account balances, net worth card, credit utilization, monthly spending total, spending by category, trend chart, recent transactions, transaction list with search and filters, merchant logo display (all table stakes and some differentiators).

**Avoids:** Pitfall 4 (amount sign convention — establish `displayAmount()` utility first), Pitfall 5 (pending double-counting — always filter `is_pending = false` for summaries), Pitfall 6 (aggregate in SQL not in JS), Pitfall 10 (Recharts memoization), Pitfall 11 (dynamic categories), Pitfall 12 (null merchant name fallback).

**Stack elements:** Server Component data loading with parallel queries, URL-driven filter state, Recharts via shadcn Chart, Supabase aggregation queries.

### Phase 3: Recurring Detection and Chat Interface

**Rationale:** Recurring detection is a standalone page with independent SQL logic — it can be built quickly after the dashboard proves the pattern. Chat is the biggest differentiator and has the most external dependencies (Anthropic API, remote MCP server, streaming); it is correctly placed last among core features so the rest of the app is stable when debugging chat-specific issues.

**Delivers:** A recurring charges page with merchant detection and monthly total. A fully functional AI chat interface with streaming responses, suggestion chips, and natural language financial queries backed by the existing MCP server.

**Addresses:** Recurring charge detection (differentiator), natural language chat (killer differentiator), suggestion chips.

**Avoids:** Pitfall 3 (Vercel timeout — Edge runtime from the start), Pitfall 8 (rate limiting on chat route), Pitfall 14 (schema in system prompt, prompt caching, conversation history limit).

**Stack elements:** Vercel AI SDK `useChat` hook, `/api/chat` Route Handler with Edge runtime, Anthropic `mcp_servers` parameter, prompt caching with `cache_control`.

### Phase 4: Deployment and Polish

**Rationale:** Vercel deployment has its own failure modes (missing env vars, cookie handling on preview vs production) that are easiest to address as a dedicated step rather than discovering during earlier phases.

**Delivers:** Production deployment with all environment variables configured, Vercel preview environment tested, income vs. spending visualization, and any remaining polish (per-account spending breakdown, loading skeletons, error states).

**Addresses:** Income vs. spending visualization (differentiator), per-account spending breakdown (differentiator).

**Avoids:** Pitfall 13 (missing Vercel env vars — checklist approach).

**Stack elements:** Vercel free tier deployment, all environment variables configured in Vercel project settings.

### Phase Ordering Rationale

- Phases 1 → 2 → 3 → 4 follow strict dependency order: auth gate before any data display, Supabase client before any queries, working data pages before adding chat on top.
- Dashboard before Transactions because the dashboard has the most complex query types and catches data convention bugs earlier.
- Recurring before Chat because recurring detection is a 30-minute win that demonstrates SQL aggregation patterns; chat has the most external API surface area and benefits from having all other pages stable.
- Deployment as Phase 4 rather than post-Phase 3 cleanup because Vercel-specific issues (Edge runtime behavior, env var handling) are best validated with a dedicated checkpoint rather than discovered during feature development.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Chat):** The `mcp_servers` parameter on Anthropic's Messages API was noted as MEDIUM confidence in architecture research — the exact parameter shape and whether it requires a beta header needs validation against current Anthropic API docs before implementation. If unavailable, the MCP SDK Client fallback approach needs a quick research pass.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Next.js 15 + shadcn/ui init + middleware auth is extremely well-documented. HIGH confidence across all sources.
- **Phase 2 (Dashboard/Transactions):** Server Component data loading, URL-driven filters, Recharts via shadcn — all established patterns with official documentation. HIGH confidence.
- **Phase 4 (Deployment):** Vercel deployment is one of the most documented operations in web development. No research phase needed.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All version choices verified against official changelogs and npm. Next.js 15.5.x, shadcn CLI v4, AI SDK 6, @supabase/ssr 0.9.x all confirmed stable as of March 2026. |
| Features | HIGH | Well-established product category (Copilot, Monarch, Lunch Money used as reference). Feature table stakes are non-controversial. |
| Architecture | HIGH (with one MEDIUM) | Server Component patterns and Supabase integration are HIGH. The `mcp_servers` Anthropic API parameter is MEDIUM — parameter shape may have evolved, fallback approach is documented. |
| Pitfalls | HIGH | All critical pitfalls verified against official Supabase, Vercel, and Plaid documentation. The service role key pitfall is confirmed by examining the existing project structure. |

**Overall confidence:** HIGH

### Gaps to Address

- **Anthropic `mcp_servers` parameter shape:** Verify current parameter format and whether a beta header is required before implementing Phase 3. If the parameter is unavailable, use the `@modelcontextprotocol/sdk` Client with `StreamableHTTPClientTransport` as fallback.
- **Vercel Edge Runtime + AI SDK compatibility:** Confirm that Vercel AI SDK 6's `streamText()` is compatible with Edge runtime in Next.js 15.5.x. This combination is well-supported in principle but should be verified in a minimal test before building full chat UI.
- **RLS policy decision:** Research noted the existing RLS only allows `service_role` access. For the single-user app architecture (all data fetching in Server Components), this is fine. If any client-side Supabase queries are added later (e.g., real-time subscriptions), `authenticated` role policies will need to be added to Supabase.

## Sources

### Primary (HIGH confidence)
- [Next.js 15 release blog](https://nextjs.org/blog/next-15)
- [Next.js 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [shadcn/ui CLI v4 changelog](https://ui.shadcn.com/docs/changelog/2026-03-cli-v4)
- [shadcn/ui Chart component docs](https://ui.shadcn.com/docs/components/radix/chart)
- [@supabase/ssr npm](https://www.npmjs.com/package/@supabase/ssr) — v0.9.0
- [Supabase SSR docs for Next.js](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [AI SDK 6 announcement](https://vercel.com/blog/ai-sdk-6)
- [Supabase API Keys docs](https://supabase.com/docs/guides/api/api-keys)
- [Vercel Functions Limitations](https://vercel.com/docs/functions/limitations)
- [Plaid Transactions API docs](https://plaid.com/docs/api/products/transactions/)
- [Plaid Transaction States](https://plaid.com/docs/transactions/transactions-data/)
- [Recharts npm](https://www.npmjs.com/package/recharts) — v3.8.0

### Secondary (MEDIUM confidence)
- [Vercel basic auth template](https://vercel.com/templates/next.js/basic-auth-password) — middleware password gate pattern
- [MCP connector docs](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector) — `mcp_servers` parameter shape
- [Anthropic Rate Limits](https://docs.anthropic.com/en/api/rate-limits)
- [Anthropic Token-Saving Updates](https://www.anthropic.com/news/token-saving-updates) — prompt caching

### Reference implementations
- [Copilot Money](https://www.copilot.money/) — feature benchmarking
- [Monarch Money](https://www.monarch.com) — feature benchmarking
- [Lunch Money](https://lunchmoney.app/features) — feature benchmarking

---
*Research completed: 2026-03-10*
*Ready for roadmap: yes*
