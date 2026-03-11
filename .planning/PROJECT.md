# FinTrack

## What This Is

FinTrack is a personal financial dashboard web app that visualizes spending data from real bank accounts (via Plaid) and provides a natural language chat interface for financial queries (via Claude + MCP). The backend is already built — Plaid ingests real bank data into Supabase via a DigitalOcean VPS webhook receiver, and a remote MCP server enables conversational SQL queries. This project builds the frontend: a single-page scrollable dashboard deployed to Vercel.

## Core Value

At-a-glance visibility into personal finances — account balances, spending trends, categorized transactions, and recurring charges — all on one dark-themed page with a chat interface for ad-hoc financial questions.

## Requirements

### Validated

- ✓ Plaid webhook receiver on DigitalOcean VPS — existing
- ✓ Supabase database with institutions, accounts, transactions, sync_log tables — existing
- ✓ MCP server (local + remote) with execute_query and get_schema tools — existing
- ✓ RLS enabled, service_role key only access — existing

### Active

- [ ] Password-protected login with 30-day session
- [ ] Single-page scrollable dashboard with all financial sections
- [ ] Summary cards: current month spending, last month with % change, transaction count
- [ ] Account balance cards with net position and credit utilization bars
- [ ] Monthly spending trend bar chart (trailing 6 months)
- [ ] Spending by category donut chart with drill-down
- [ ] Recent transactions collapsible panel with search/filter
- [ ] Recurring charges collapsible panel with auto-detection
- [ ] Chat interface via floating button + drawer (Anthropic API + MCP)
- [ ] Dark theme only, teal/cyan accent, Copilot-style aesthetic
- [ ] Mobile-optimized with bottom tab bar for section jumps
- [ ] Deployed to Vercel

### Out of Scope

- Multi-user support — personal/household use only
- Light theme / theme toggle — dark only
- Multi-page routing — single scrollable page
- Plaid Link flow in frontend — bank connections managed separately
- Investment/retirement account tracking — consumer credit, lending, checking/savings only
- Budget setting / goal tracking — potential Phase 3
- Native mobile app — PWA covers mobile access
- Anomaly detection / alert rules engine — Phase 2 post-MVP
- PWA push notifications — Phase 2 post-MVP
- Transaction category management — Phase 2 post-MVP

## Context

### Existing Backend
- **Database:** Supabase (Postgres) with 4 tables: institutions, accounts, transactions, sync_log
- **Data flow:** Plaid webhook → VPS → Supabase. Frontend reads only.
- **MCP server:** Remote at claudefinancetracker.xyz/mcp (authless), execute_query + get_schema
- **Connected institutions:** 1 (US Bank) — 2 checking, 2 credit cards, 1 auto loan
- **Future institutions:** Amex, Wells Fargo, Chase, Capital One, Bank of America

### Data Conventions
- Plaid amounts: positive = spending/debits, negative = income/refunds
- RLS enabled on all tables, service_role key required for access
- Indexes on transactions(date), transactions(merchant_name), transactions(category_primary), etc.

### Design Direction
- Copilot-style aesthetic: warm, approachable fintech with rounded cards, soft gradients
- Teal/cyan accent color
- Neo-grotesque typography (Satoshi/General Sans)
- Charts: muted harmonious palette, 10+ category colors
- Login: full-bleed gradient background with floating 3D-style card

## Constraints

- **Tech stack:** Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, Recharts, supabase-js, Anthropic SDK
- **Deployment:** Vercel (free tier)
- **Security:** No service_role key in browser. Dashboard reads via server-side or anon key with RLS. Chat API route server-side only.
- **Auth:** Simple password gate (env var), not Supabase Auth
- **Theme:** Dark only, no toggle
- **Layout:** Single scrollable page, no multi-page routing

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Single page over multi-page routing | All financial data visible by scrolling, collapsible panels for density | — Pending |
| Password gate over Supabase Auth | Single user, personal app, simplest possible auth | — Pending |
| Dark theme only | Personal preference, fintech aesthetic, reduces scope | — Pending |
| Anthropic SDK + MCP for chat | Existing MCP server already works, Claude generates SQL directly | — Pending |
| supabase-js for dashboard reads | Direct reads from Supabase, RLS policies for anon role | — Pending |
| Recharts for charts | Clean API, financial chart defaults, React-native | — Pending |

---
*Last updated: 2026-03-10 after initialization*
