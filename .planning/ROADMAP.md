# Roadmap: FinTrack Frontend Dashboard

## Overview

FinTrack is a read-only frontend dashboard over an existing Plaid + Supabase backend. The build progresses through four phases: scaffolding the project with auth and layout (Phase 1), building the two data-heavy pages -- dashboard and transactions (Phase 2), adding recurring detection and the AI chat interface (Phase 3), and deploying to Vercel with final polish (Phase 4). Each phase delivers a complete, verifiable capability and unblocks the next.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation and Auth** - Project scaffolding, password gate, layout shell, dark/light theme, Supabase server client
- [ ] **Phase 2: Dashboard and Transactions** - Account balances, spending charts, category breakdown, suspicious flags, transaction browser with search/filters
- [ ] **Phase 3: Recurring and Chat** - Auto-detected recurring charges and natural language financial queries via Claude + MCP
- [ ] **Phase 4: Deployment and Polish** - Vercel production deployment, mobile responsiveness validation, final polish

## Phase Details

### Phase 1: Foundation and Auth
**Goal**: User can access a password-protected app with sidebar navigation and dark/light theme support
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05
**Success Criteria** (what must be TRUE):
  1. User is redirected to a login page when visiting any route without a valid session
  2. User can enter a password and gain access to the app, with session persisting across browser refreshes
  3. User can navigate between Dashboard, Transactions, Recurring, and Chat pages via a sidebar that collapses on mobile
  4. User can toggle between dark and light themes, with dark as default and preference surviving page reloads
  5. Supabase data is fetched server-side only -- no service_role key or financial data appears in browser network tab or JS bundle
**Plans:** 3 plans

Plans:
- [ ] 01-01-PLAN.md — Scaffold Next.js 15, generate design system, configure teal/cyan theme with Satoshi font, Supabase server client, test infrastructure
- [ ] 01-02-PLAN.md — Middleware auth gate, password validation API route, login page with FinTrack branding and shake animation
- [ ] 01-03-PLAN.md — Sidebar navigation, mobile bottom tab bar, theme toggle, app layout shell, placeholder pages

### Phase 2: Dashboard and Transactions
**Goal**: User can see their complete financial picture at a glance and browse/search all transactions
**Depends on**: Phase 1
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, TXNS-01, TXNS-02
**Success Criteria** (what must be TRUE):
  1. User can see individual account cards with current balance, account type, and institution name on the dashboard
  2. User can see a net position card (total cash minus total credit minus total loans) and credit utilization bars for each credit card
  3. User can see a category breakdown chart for spending in the last 2 weeks and a list of recent transactions (last 30 days)
  4. User sees automated flags on unusually large transactions, new merchants above threshold, or duplicate charges
  5. User can search transactions by merchant name or description, and filter by date range, category, account, and amount range
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD
- [ ] 02-03: TBD

### Phase 3: Recurring and Chat
**Goal**: User can review recurring charges and ask natural language financial questions answered by Claude
**Depends on**: Phase 2
**Requirements**: RECR-01, RECR-02, CHAT-01, CHAT-02, CHAT-03
**Success Criteria** (what must be TRUE):
  1. User can see auto-detected recurring charges with merchant name, amount, frequency (weekly/monthly/quarterly), and last charge date
  2. User can see an estimated monthly recurring total at the top of the recurring page
  3. User can type a natural language financial question and receive a streaming response from Claude that queries their actual financial data
  4. User sees a chat interface with message bubbles, a loading indicator during responses, and smart suggestion chips based on recent queries
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

### Phase 4: Deployment and Polish
**Goal**: App is live on Vercel and works correctly across devices
**Depends on**: Phase 3
**Requirements**: DEPL-01, DEPL-02
**Success Criteria** (what must be TRUE):
  1. App is deployed to Vercel with all environment variables configured and accessible at production URL
  2. All pages render correctly and are usable on both mobile and desktop browsers
  3. Auth gate, data loading, and chat streaming all function correctly in production (not just local dev)
**Plans**: TBD

Plans:
- [ ] 04-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation and Auth | 0/3 | Planning complete | - |
| 2. Dashboard and Transactions | 0/0 | Not started | - |
| 3. Recurring and Chat | 0/0 | Not started | - |
| 4. Deployment and Polish | 0/0 | Not started | - |
