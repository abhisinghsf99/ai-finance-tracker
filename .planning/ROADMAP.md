# Roadmap: FinTrack

## Overview

FinTrack builds a personal finance dashboard frontend on top of an existing Supabase + Plaid backend. The roadmap moves from foundation (auth, data layer, layout shell, deployment) through visual dashboard sections (summary cards, account cards, charts) to interactive panels (transactions, recurring detection) and finally the AI chat differentiator (Claude + MCP). Each phase delivers a complete, verifiable capability against real bank data.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation and Layout** - Auth gate, typed data layer, dark theme, page layout shell, and Vercel deployment (completed 2026-03-11)
- [ ] **Phase 2: Dashboard Visuals** - Summary cards, account cards, spending trend chart, and category donut chart
- [x] **Phase 3: Interactive Panels** - Transaction list with search/filter/sort and recurring charge detection panel (completed 2026-03-11)
- [ ] **Phase 4: Chat System** - Floating chat drawer with Claude + MCP for natural language financial queries

## Phase Details

### Phase 1: Foundation and Layout
**Goal**: Users see a secure, dark-themed login page that gates a single-page dashboard shell deployed to Vercel, with all data infrastructure ready for dashboard components
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, LAYO-01, LAYO-02, LAYO-03, LAYO-04
**Success Criteria** (what must be TRUE):
  1. User visits the app URL on Vercel, sees a login page, and cannot access the dashboard without the correct password
  2. After logging in, user sees a dark-themed single-page layout with top nav (logo + sign out) and the session persists for 30 days
  3. On mobile, the layout shows a compact top nav and bottom tab bar for section navigation
  4. The typed query layer exists in lib/queries/ and Plaid amount utilities exist in lib/plaid-amounts.ts (developer-verifiable, not user-facing)
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md -- Foundation code: sign-out endpoint, dark theme hardcoding, typed query layer, Plaid amount utilities
- [ ] 01-02-PLAN.md -- Layout restructuring: top nav, single-page sections, mobile bottom tab bar with anchor navigation
- [ ] 01-03-PLAN.md -- Vercel deployment and end-to-end verification

### Phase 2: Dashboard Visuals
**Goal**: Users see their real financial data at a glance -- spending summaries, account balances, and spending charts with category breakdown
**Depends on**: Phase 1
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, CHRT-01, CHRT-02, CHRT-03, CHRT-04
**Success Criteria** (what must be TRUE):
  1. User sees current month spending total, last month total with percentage change, and transaction count in summary cards
  2. User sees each linked account with name, last 4 digits, balance, and type; plus a net position card and credit utilization bars color-coded green/amber/red
  3. User sees a 6-month spending trend bar chart and can hover any bar to see the exact amount
  4. User sees a category donut chart for current month spending and can click any category to see its transactions
  5. All charts render correctly with muted harmonious palette and 10+ distinct category colors on both desktop and mobile
**Plans**: 2 plans

Plans:
- [ ] 02-01-PLAN.md -- Dashboard cards: install Recharts, add query functions, summary cards, net position, account cards with credit utilization
- [ ] 02-02-PLAN.md -- Charts and page wiring: spending trend bar chart, category donut with drill-down, wire all components into page.tsx

### Phase 3: Interactive Panels
**Goal**: Users can explore their full transaction history with search and filters, and see automatically detected recurring charges
**Depends on**: Phase 2
**Requirements**: TXNS-01, TXNS-02, TXNS-03, TXNS-04, TXNS-05, RECR-01, RECR-02, RECR-03
**Success Criteria** (what must be TRUE):
  1. User sees a collapsible transactions panel (default collapsed showing count) that expands to show merchant name, amount, category, date, and account for each transaction
  2. User can search transactions by merchant name, filter by date range / category / amount range / account, and sort by date / amount / merchant
  3. User sees a collapsible recurring charges panel (default collapsed showing monthly total) with each entry showing merchant name, amount, frequency, last charge date, and charge count
  4. Recurring detection correctly groups transactions by merchant + rounded amount with at least 3 occurrences and infers frequency
**Plans**: 3 plans

Plans:
- [ ] 03-01-PLAN.md -- Utility layer: shadcn component installs, transaction filter/sort pipeline, recurring detection algorithm, query extension for account names
- [ ] 03-02-PLAN.md -- Transaction panel: collapsible panel with search/filter/sort toolbar, transaction rows, filter popover, load-more
- [ ] 03-03-PLAN.md -- Recurring panel and page wiring: recurring charges panel, wire both panels into dashboard page.tsx

### Phase 4: Chat System
**Goal**: Users can ask natural language questions about their finances and get conversational answers powered by live database queries
**Depends on**: Phase 3
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05
**Success Criteria** (what must be TRUE):
  1. User sees a floating chat button (bottom-right) that opens a chat drawer with suggestion chips for common queries
  2. User can type a financial question and receive a streaming conversational response with user/assistant message bubbles and a loading indicator
  3. Claude generates and executes SQL via the MCP server's execute_query tool and returns a human-readable answer (not raw SQL or JSON)
  4. Chat works correctly on Vercel deployment without streaming timeouts for typical queries
**Plans**: 2 plans

Plans:
- [ ] 04-01-PLAN.md -- Backend + contracts: install AI SDK deps, system prompt config, chat API route with MCP integration, markdown message component
- [ ] 04-02-PLAN.md -- Chat UI: FAB, full-screen chat overlay, suggestion chips, typing indicator, input bar, dashboard + mobile nav wiring

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation and Layout | 3/3 | Complete   | 2026-03-11 |
| 2. Dashboard Visuals | 1/2 | In Progress|  |
| 3. Interactive Panels | 3/3 | Complete   | 2026-03-11 |
| 4. Chat System | 0/2 | Not started | - |
