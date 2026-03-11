# Requirements: FinTrack

**Defined:** 2026-03-10
**Core Value:** At-a-glance visibility into personal finances with a chat interface for ad-hoc financial questions

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Foundation

- [ ] **FOUND-01**: Project initializes with Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui
- [ ] **FOUND-02**: Password-protected login with 30-day session cookie and sign out
- [ ] **FOUND-03**: All Supabase reads go through server-side service_role key (no anon key in browser)
- [ ] **FOUND-04**: Typed query layer in lib/queries/ with Plaid amount convention utilities
- [ ] **FOUND-05**: Dark theme only with teal/cyan accent, Copilot-style aesthetic, neo-grotesque font

### Dashboard Overview

- [ ] **DASH-01**: Summary cards showing current month spending, last month with % change, and transaction count
- [ ] **DASH-02**: Individual account cards with name, last 4 digits, balance, and account type
- [ ] **DASH-03**: Net position card showing total cash minus total credit minus total loans
- [ ] **DASH-04**: Credit utilization bars for each credit card with color coding (green/amber/red)

### Charts

- [ ] **CHRT-01**: Monthly spending trend bar chart showing trailing 6 months with hover for exact amounts
- [ ] **CHRT-02**: Spending by category donut chart for current month with legend
- [ ] **CHRT-03**: Category drill-down — clicking a category shows its transactions
- [ ] **CHRT-04**: Charts use muted harmonious palette with 10+ distinct category colors

### Transactions

- [ ] **TXNS-01**: Recent transactions in collapsible panel, default collapsed showing count
- [ ] **TXNS-02**: Expanded transactions show merchant name, amount, category, date, account (last 4)
- [ ] **TXNS-03**: Search transactions by merchant name or description
- [ ] **TXNS-04**: Filter transactions by date range, category, amount range, and account
- [ ] **TXNS-05**: Sort transactions by date, amount, or merchant

### Recurring

- [ ] **RECR-01**: Recurring charges in collapsible panel, default collapsed showing monthly total
- [ ] **RECR-02**: Each recurring entry shows merchant name, amount, frequency, last charge date, charge count
- [ ] **RECR-03**: Detection logic groups by merchant_name + rounded amount with COUNT >= 3 and frequency inference

### Chat

- [ ] **CHAT-01**: Floating chat button (bottom-right) opens a chat drawer/modal
- [ ] **CHAT-02**: Chat message area with user/assistant bubbles and loading indicator
- [ ] **CHAT-03**: Suggestion chips for common queries on empty state
- [ ] **CHAT-04**: /api/chat route calls Anthropic API with MCP server for SQL queries
- [ ] **CHAT-05**: Claude generates SQL via execute_query tool and returns conversational response

### Layout & Mobile

- [ ] **LAYO-01**: Single scrollable page with top nav bar (logo left, sign out right)
- [ ] **LAYO-02**: Desktop: single column with max-width container
- [ ] **LAYO-03**: Mobile: compact top nav, bottom tab bar for section jumps (Summary, Accounts, Transactions, Chat)
- [ ] **LAYO-04**: Deployed to Vercel with environment variables configured

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Alerts & Notifications

- **ALRT-01**: PWA with push notifications for transaction alerts
- **ALRT-02**: Anomaly detection: unusually large charges, new merchants above threshold, duplicate charges
- **ALRT-03**: Alert rules engine with configurable thresholds

### Category Management

- **CATM-01**: Recategorize individual transactions
- **CATM-02**: Create custom categories beyond Plaid taxonomy
- **CATM-03**: Bulk recategorize all transactions from a specific merchant
- **CATM-04**: Auto-cleanup empty categories from UI

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-user support | Personal/household use only |
| Light theme / theme toggle | Dark only, reduces scope |
| Multi-page routing | Single scrollable page design |
| Plaid Link flow in frontend | Bank connections managed separately via VPS |
| Investment/retirement accounts | Consumer credit, lending, checking/savings only |
| Budget setting / goal tracking | Potential Phase 3, not core dashboard |
| Native mobile app | PWA covers mobile access |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | TBD | Pending |
| FOUND-02 | TBD | Pending |
| FOUND-03 | TBD | Pending |
| FOUND-04 | TBD | Pending |
| FOUND-05 | TBD | Pending |
| DASH-01 | TBD | Pending |
| DASH-02 | TBD | Pending |
| DASH-03 | TBD | Pending |
| DASH-04 | TBD | Pending |
| CHRT-01 | TBD | Pending |
| CHRT-02 | TBD | Pending |
| CHRT-03 | TBD | Pending |
| CHRT-04 | TBD | Pending |
| TXNS-01 | TBD | Pending |
| TXNS-02 | TBD | Pending |
| TXNS-03 | TBD | Pending |
| TXNS-04 | TBD | Pending |
| TXNS-05 | TBD | Pending |
| RECR-01 | TBD | Pending |
| RECR-02 | TBD | Pending |
| RECR-03 | TBD | Pending |
| CHAT-01 | TBD | Pending |
| CHAT-02 | TBD | Pending |
| CHAT-03 | TBD | Pending |
| CHAT-04 | TBD | Pending |
| CHAT-05 | TBD | Pending |
| LAYO-01 | TBD | Pending |
| LAYO-02 | TBD | Pending |
| LAYO-03 | TBD | Pending |
| LAYO-04 | TBD | Pending |

**Coverage:**
- v1 requirements: 30 total
- Mapped to phases: 0
- Unmapped: 30

---
*Requirements defined: 2026-03-10*
*Last updated: 2026-03-10 after initial definition*
