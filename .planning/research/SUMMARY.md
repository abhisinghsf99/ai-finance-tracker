# Project Research Summary

**Project:** FinTrack — Personal Finance Dashboard
**Domain:** Single-user personal finance dashboard (Next.js App Router + Supabase + Anthropic MCP chat)
**Researched:** 2026-03-10
**Confidence:** HIGH

## Executive Summary

FinTrack is a read-only personal finance dashboard that connects to an existing Supabase backend (populated via Plaid webhooks) and surfaces spending insights, account balances, transaction history, and an AI chat interface powered by Claude + MCP. The recommended build approach follows the Next.js App Router "server component with client islands" pattern: page-level server components fetch all Supabase data server-side using a typed query layer, then pass data as props to thin client components that handle interactivity (Recharts charts, collapsible panels, search filters). The chat system is an independent subsystem — a floating drawer sends messages to `/api/chat`, which orchestrates Anthropic streaming + MCP tool calls server-side and streams responses back. The stack is intentionally minimal: 4 new packages total on top of an already-solid foundation.

The project's primary differentiator is the natural language chat interface: no consumer finance app allows arbitrary SQL-powered questions against live bank data. Everything else (balance display, spending charts, category breakdown, transaction search) matches the table stakes of Monarch Money and Empower but with a distinct dark, Copilot-style aesthetic. Research strongly recommends building the core dashboard first and adding chat second — the dashboard validates data quality and chat answers "did I overspend?" questions that would otherwise drive scope creep toward budgeting features.

The highest-impact risks are: (1) Supabase `service_role` key leaking to the browser — prevented by enforcing a server-only query layer before any UI is built; (2) Recharts SSR hydration crashes — prevented by wrapping every chart with `next/dynamic({ ssr: false })` from the first chart component; (3) Plaid amount sign conventions being misapplied throughout — prevented by creating `lib/plaid-amounts.ts` before any component renders dollar amounts; and (4) Vercel streaming timeouts in the chat feature — mitigated by proper `ReadableStream` response handling and testing on Vercel early. All four have clear prevention strategies that cost minutes to establish but would cost hours to fix retroactively.

## Key Findings

### Recommended Stack

The project already has Next.js 15, React 19, TypeScript 5, Tailwind 4, shadcn/ui, Supabase JS, Vitest, and Lucide — all validated as correct choices. Only 4 new packages are needed: `recharts` (v3.8.0 — shadcn/ui's official chart layer), `ai` (Vercel AI SDK v6), `@ai-sdk/anthropic` (Claude provider), and `@ai-sdk/react`. One critical environment fix is also required: add `"overrides": { "react-is": "19.1.0" }` to `package.json` before installing Recharts, or charts will silently render blank under React 19.

**Core technologies:**
- Recharts v3.8.0: chart rendering — shadcn/ui's official chart foundation, composable API, no wrapper lock-in
- Vercel AI SDK v6 (`ai` + `@ai-sdk/anthropic`): chat streaming — provides `useChat`, `streamText`, and `experimental_createMCPClient` out of the box; replaces 3-4x the code the raw Anthropic SDK would require
- `@supabase/supabase-js` (already installed): data access — all queries go through server-side service_role; `@supabase/ssr` is NOT needed for this project's password-gate auth model
- `next-themes`: REMOVE — dark-only app does not need theme switching; hardcode dark theme in `layout.tsx` directly

**Critical version note:** The `react-is` override (`"19.1.0"` to match React version) is required before adding Recharts. Without it, `ResponsiveContainer` renders blank on first load.

### Expected Features

Feature research confirms FinTrack's scope aligns with what users expect from post-Mint finance apps. The feature dependency tree is clear: auth and the query layer must exist before any dashboard component; account/spending cards come before charts; charts come before the transaction panel; recurring detection builds on the same transaction data; chat is fully independent and the highest-complexity item.

**Must have (table stakes):**
- Password gate with 30-day session — security baseline; users expect a gate on financial data
- Account balance cards with net position — first thing users check in any finance app
- Current month spending summary with month-over-month % change — the core "how am I doing?" signal
- Monthly spending trend bar chart (6 months) — universal in Monarch, Empower, Simplifi
- Spending by category donut chart — universal; Plaid `category_primary` maps directly to it
- Transaction list with search and filter — second most common action after balance check
- Mobile-responsive layout — finance apps are used across 2.7 devices on average

**Should have (differentiators):**
- Natural language chat interface (Claude + MCP) — primary differentiator; no competitor offers ad-hoc SQL-powered questions against live data
- Recurring charge detection panel — now expected post-Mint; complex algorithm but high user value
- Credit utilization bars on account cards — Empower does this, most apps do not
- Category drill-down (click donut segment) — interaction refinement on existing chart component

**Defer (v2+):**
- Anomaly detection / smart alerts — requires threshold config, notification delivery, false positive management
- Budget setting / goal tracking — a full product, not a feature; chat handles ad-hoc budget questions without this overhead
- Transaction category editing — rabbit hole of custom categories, merge rules, ML re-application
- Multi-user / household support — requires user management, permission models, invitation flow

### Architecture Approach

The architecture is a clean two-tier system. The dashboard tier uses Next.js App Router server components for all Supabase data fetching (parallel queries via `Promise.all` in `page.tsx`), with client component islands only for interactive elements (Recharts charts, collapsible panels, search). The chat tier is an independent streaming system: a client-side `ChatDrawer` posts to `/api/chat`, which orchestrates Anthropic SDK + MCP client server-side and returns a `ReadableStream`. The two tiers share no state and can be built in parallel — but dashboard should come first to validate the data model.

**Major components:**
1. `lib/queries/` — typed Supabase query layer; server-only; established before any UI; enforces service_role stays server-side
2. `components/dashboard/` — six section components: `SummaryCards` (SC), `AccountCards` (SC), `MonthlyTrend` (CC), `CategoryBreakdown` (CC), `TransactionsPanel` (CC), `RecurringPanel` (CC)
3. `components/chat/` — `ChatDrawer`, `ChatMessages`, `ChatInput`; fully independent; floats as an overlay on all pages via the app layout
4. `app/api/chat/route.ts` — Anthropic SDK + MCP client; streaming endpoint; holds all API keys server-side exclusively
5. `types/database.ts` — TypeScript types mirroring Supabase schema; prevents `any` creep across all query results

**Key architectural constraints — non-negotiable:**
- `service_role` key never in client components or `NEXT_PUBLIC_` env vars
- Recharts components always wrapped with `next/dynamic({ ssr: false })`
- `page.tsx` files never marked `"use client"`
- MCP client never instantiated in browser code (Node.js library, CORS-blocked anyway)

### Critical Pitfalls

1. **Recharts SSR hydration crash** — wrap every chart with `next/dynamic({ ssr: false }, loading: () => <ChartSkeleton />)`. Set this pattern in the first chart component so all subsequent charts copy it. Warning signs: blank charts on first load, console errors about width/height of 0, hydration text-content mismatch errors.

2. **Supabase service_role key in client bundle** — keep `SUPABASE_SERVICE_ROLE_KEY` without `NEXT_PUBLIC_` prefix; route all queries through the `lib/queries/` server-only layer. Risk is severe: service_role bypasses all RLS, and the `institutions` table holds Plaid access tokens.

3. **Plaid amount sign convention misapplied** — create `lib/plaid-amounts.ts` with `isSpending`, `isIncome`, `totalSpending`, `displayAmount` helpers BEFORE any component renders amounts. Plaid positive = spending, negative = income — opposite of developer intuition. Centralizing in one module prevents the same bug multiplying across every chart and card.

4. **Vercel streaming timeout** — return `stream.toReadableStream()` directly (never buffer full response); set `export const maxDuration = 60` in the chat route config; test on Vercel before polishing chat UI. Hobby plan caps at 10 seconds; MCP tool calls alone take 2-5 seconds.

5. **"use client" boundary creep** — only interactive leaf nodes get `"use client"`: chart wrappers, search inputs, collapsible triggers. `page.tsx` and section-structure components stay as server components. Creep forces `useEffect` data fetching, kills SSR benefits, and makes service_role key usage impossible safely.

## Implications for Roadmap

Based on the dependency tree from FEATURES.md and the build order from ARCHITECTURE.md, here is the suggested phase structure:

### Phase 1: Foundation and Data Layer
**Rationale:** Everything downstream depends on typed data access and security boundaries being correct from the start. Establishing `lib/queries/`, `types/database.ts`, `lib/plaid-amounts.ts`, and the auth middleware before any UI prevents the three most expensive pitfalls.
**Delivers:** Typed Supabase query functions for all tables; Plaid amount utility module with unit tests; environment variable audit (no `NEXT_PUBLIC_` service_role key); dark theme hardcoded in `layout.tsx` (next-themes removed); `lib/formatters.ts` for currency and date formatting; `react-is` override added to `package.json`.
**Addresses:** Auth gate (table stakes), security baseline
**Avoids:** Pitfalls 2 (service_role exposure), 3 (Plaid amount signs), 6 ("use client" boundary creep)

### Phase 2: Dashboard Cards (Summary and Accounts)
**Rationale:** These are pure server components with no interactivity — the simplest possible components that validate the query layer with real data on screen. No Recharts dependency yet. A fast confidence-builder before adding client component complexity.
**Delivers:** Account balance cards, net position display, credit utilization bars, current month spending summary with % change vs. last month, transaction count metric.
**Addresses:** Account overview, net position, spending summary (all P1 table stakes)
**Avoids:** Dark theme CSS variable system is established here before charts add rendering complexity
**Research flag:** None — server components with Supabase queries follow well-documented standard patterns.

### Phase 3: Charts (Recharts Integration)
**Rationale:** Charts are the first client components and the first Recharts usage. Establishing `next/dynamic({ ssr: false })` and `ResponsiveContainer` with explicit pixel heights in this phase creates patterns that all future charts copy. The `react-is` override must be in `package.json` before this phase installs Recharts.
**Delivers:** Monthly spending trend bar chart (6 months), spending by category donut chart with click-to-drill, category drill-down interaction, Recharts theme config aligned with dark CSS variables (transparent backgrounds, `hsl(var(--muted-foreground))` text, `hsl(var(--border))` grid lines).
**Addresses:** Monthly trend chart, category breakdown (P1 table stakes)
**Avoids:** Pitfalls 1 (SSR hydration crash), 2 (ResponsiveContainer height collapse), 7 (dark theme inconsistency in charts)
**Research flag:** None — shadcn/ui Recharts v3 integration is well-documented; `react-is` override is a known, confirmed fix.

### Phase 4: Collapsible Panels (Transactions and Recurring)
**Rationale:** These are the most interactive dashboard components with the most complex queries (pagination, search, pattern detection). Building after charts means the client component pattern is established. Recurring detection is the hardest table-stakes feature and needs focused attention.
**Delivers:** Paginated transaction list with search (merchant name) and filter (date range, category, account); collapsible panel with expand/collapse state; recurring charge detection algorithm with merchant normalization; recurring charges list panel.
**Addresses:** Transaction list with search/filter, recurring detection (P1 and P2 features)
**Avoids:** Fetching all transactions client-side (paginate server-side from day one); empty data edge cases in recurring algorithm
**Research flag:** Recurring detection algorithm needs a design spike — merchant name normalization ("Netflix" vs "NETFLIX.COM") is non-trivial and determines whether detection is reliable.

### Phase 5: Chat System (Claude + MCP)
**Rationale:** The primary differentiator, but highest complexity and risk. Building after the dashboard means real data exists to query via chat, and the team has internalized the data model. Vercel streaming must be tested on actual Vercel deployment in this phase — not just localhost — before the chat UI is polished.
**Delivers:** `/api/chat` route handler with Anthropic streaming + MCP tool call orchestration; `ChatDrawer` floating button + sheet overlay; multi-turn conversation with full message history; streaming response display with token-by-token updates.
**Addresses:** Natural language chat interface (primary differentiator)
**Avoids:** Pitfall 4 (streaming timeout — test on Vercel early, not at the end); exposes need to add rate limiting on the chat endpoint; surfaces MCP server authentication gap
**Research flag:** `experimental_createMCPClient` in Vercel AI SDK v6 is marked experimental. Validate the MCP connection to `claudefinancetracker.xyz/mcp` and the tool call flow end-to-end before designing the chat UI. The API may have rough edges not covered in docs.

### Phase 6: Polish and Mobile
**Rationale:** Polish layer that requires all sections to exist. Mobile responsiveness should be verified during each prior phase, but a dedicated polish phase catches cross-section issues (bottom nav overlapping content, chart label readability at 375px, loading state consistency).
**Delivers:** Verified mobile layout at 375px for every section; Suspense boundaries with skeleton loaders per section; error boundaries per section; empty data edge case verification for all charts and cards; amount formatting audit ($1,234.50 consistently); UTC date handling verification for Plaid's plain-date fields.
**Addresses:** Mobile-responsive layout (P1 table stakes)
**Avoids:** All UX pitfalls documented in PITFALLS.md — loading states showing $0.00 as real data, raw Plaid category labels ("FOOD_AND_DRINK_RESTAURANTS"), charts without month-over-month context, empty search result feedback, mobile chart readability
**Research flag:** None — standard polish and accessibility patterns.

### Phase Ordering Rationale

- **Data layer before UI:** ARCHITECTURE.md explicitly calls this out. PITFALLS.md confirms that the service_role exposure, Plaid amount sign, and "use client" creep pitfalls are all prevented only if the data layer exists first.
- **Simple server components before interactive client components:** Cards (Phase 2) before charts (Phase 3) before stateful panels (Phase 4) follows the natural dependency chain from FEATURES.md and validates each layer before adding complexity.
- **Chat last:** FEATURES.md explicitly notes "add chat after dashboard is stable so you have something to compare AI answers against." Chat also carries the highest risk profile (experimental API, streaming, MCP round-trips). Doing it last means pitfalls in earlier phases do not block the highest-value feature.
- **Pitfall prevention gates each phase:** Phases 1-3 collectively prevent the five most expensive pitfalls before any of the complex interactive features are built.

### Research Flags

Phases likely needing deeper research or a design spike during planning:
- **Phase 4 (Recurring Detection):** Merchant name normalization for pattern matching is a known hard problem with no obvious off-the-shelf solution in the JS ecosystem. Evaluate fuzzy string matching approaches before committing to an algorithm.
- **Phase 5 (Chat/MCP):** `experimental_createMCPClient` is experimental in AI SDK v6. Validate the API against the actual MCP server (`claudefinancetracker.xyz/mcp`) early — do not design the chat UI before confirming the tool call flow works end-to-end on a deployed Vercel environment.

Phases with standard patterns (skip `/gsd:research-phase`):
- **Phase 1 (Foundation):** Standard Next.js environment variable patterns and Supabase server client setup.
- **Phase 2 (Dashboard Cards):** Server components with Supabase queries — extensively documented official patterns.
- **Phase 3 (Charts):** shadcn/ui Recharts v3 integration is documented; `next/dynamic` SSR pattern is standard.
- **Phase 6 (Polish):** Standard mobile, accessibility, and loading state patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All packages verified on npm; `react-is` override confirmed in shadcn/ui official PR #8486; AI SDK v6 is stable and Vercel-maintained |
| Features | HIGH | Verified against Monarch Money, Empower, Rocket Money current feature sets; competitor analysis from 2025-2026 sources |
| Architecture | HIGH | Based on direct codebase analysis (middleware, auth, Supabase client, migration SQL) + official Next.js App Router patterns |
| Pitfalls | HIGH | All pitfalls verified against official docs, GitHub issues (with issue numbers), and Vercel production guidance — not speculative |

**Overall confidence:** HIGH

### Gaps to Address

- **Recurring detection algorithm:** Research identifies the problem scope (merchant normalization, interval detection, confidence scoring) but does not prescribe a specific implementation. Needs a design spike during Phase 4 planning.
- **MCP server authentication:** PITFALLS.md flags `claudefinancetracker.xyz/mcp` as unauthenticated. This is a backend concern but the frontend chat route should add an API key header to MCP requests as soon as the server supports one. Flag for Phase 5.
- **Vercel plan tier for streaming:** Hobby = 10-second limit, Pro = 60-second limit. MCP tool calls take 2-5 seconds before LLM generation begins. Confirm which plan is active before designing the chat UX — if Hobby, the MCP tool-call pattern may need adjustment (pre-fetch data as context instead of real-time tool calls).
- **General Sans vs Satoshi font:** Stack research recommends General Sans (free, on Fontsource). If the design direction requires Satoshi specifically, it requires purchase and `next/font/local` hosting. Confirm before Phase 6.

## Sources

### Primary (HIGH confidence)
- [shadcn/ui Recharts v3 PR #8486](https://github.com/shadcn-ui/ui/pull/8486/files) — official v3 support and `react-is` override documentation
- [shadcn/ui React 19 guide](https://ui.shadcn.com/docs/react-19) — `react-is` override requirement confirmed
- [AI SDK v6 docs](https://ai-sdk.dev/docs/introduction) — `useChat`, `streamText`, `experimental_createMCPClient`
- [Vercel: Common Mistakes with App Router](https://vercel.com/blog/common-mistakes-with-the-next-js-app-router-and-how-to-fix-them) — server/client boundary anti-patterns
- [Vercel Serverless Timeout KB](https://vercel.com/kb/guide/what-can-i-do-about-vercel-serverless-functions-timing-out) — plan-level streaming timeout limits
- [Plaid Transactions API](https://plaid.com/docs/api/products/transactions/) — amount sign convention (positive = debit/spending)
- [Supabase API Keys Docs](https://supabase.com/docs/guides/api/api-keys) — service_role vs anon key security model
- [Supabase RLS Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) — policy best practices
- Existing codebase: middleware, auth route, Supabase client factory, migration SQL, MCP server tools.js

### Secondary (MEDIUM confidence)
- [Monarch Money features](https://www.monarch.com/features/tracking) — competitor feature set baseline
- [Rob Berger: Mint alternatives](https://robberger.com/mint-alternatives/) — competitive landscape
- [The State of Personal Finance Apps in 2025](https://bountisphere.com/blog/personal-finance-apps-2025-review) — market context
- [Top 10 AI Personal Finance Assistant Tools](https://www.bestdevops.com/top-10-ai-personal-finance-assistants-tools-in-2025-features-pros-cons-comparison/) — AI chat feature landscape
- [Recharts ResponsiveContainer issues #1545, #3688, #5388](https://github.com/recharts/recharts/issues/) — height/resize bug documentation

### Tertiary (LOW confidence, informational)
- [Personal Finance Apps: What Users Expect in 2025](https://www.wildnetedge.com/blogs/personal-finance-apps-what-users-expect-in-2025) — user expectations survey (methodology unclear)

---
*Research completed: 2026-03-10*
*Ready for roadmap: yes*
