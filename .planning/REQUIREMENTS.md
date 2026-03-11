# Requirements: FinTrack

**Defined:** 2026-03-10
**Core Value:** At-a-glance visibility into personal finances with a chat interface for ad-hoc financial questions

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Foundation

- [x] **FOUND-01**: Project initializes with Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui
- [x] **FOUND-02**: Password-protected login with 30-day session cookie and sign out
- [x] **FOUND-03**: All Supabase reads go through server-side service_role key (no anon key in browser)
- [x] **FOUND-04**: Typed query layer in lib/queries/ with Plaid amount convention utilities
- [x] **FOUND-05**: Dark theme only with teal/cyan accent, Copilot-style aesthetic, neo-grotesque font

### Dashboard Overview

- [x] **DASH-01**: Summary cards showing current month spending, last month with % change, and transaction count
- [x] **DASH-02**: Individual account cards with name, last 4 digits, balance, and account type
- [x] **DASH-03**: Net position card showing total cash minus total credit minus total loans
- [x] **DASH-04**: Credit utilization bars for each credit card with color coding (green/amber/red)

### Charts

- [x] **CHRT-01**: Monthly spending trend bar chart showing trailing 6 months with hover for exact amounts
- [x] **CHRT-02**: Spending by category donut chart for current month with legend
- [x] **CHRT-03**: Category drill-down — clicking a category shows its transactions
- [x] **CHRT-04**: Charts use muted harmonious palette with 10+ distinct category colors

### Transactions

- [x] **TXNS-01**: Recent transactions in collapsible panel, default collapsed showing count
- [x] **TXNS-02**: Expanded transactions show merchant name, amount, category, date, account (last 4)
- [x] **TXNS-03**: Search transactions by merchant name or description
- [x] **TXNS-04**: Filter transactions by date range, category, amount range, and account
- [x] **TXNS-05**: Sort transactions by date, amount, or merchant

### Recurring

- [ ] **RECR-01**: Recurring charges in collapsible panel, default collapsed showing monthly total
- [ ] **RECR-02**: Each recurring entry shows merchant name, amount, frequency, last charge date, charge count
- [x] **RECR-03**: Detection logic groups by merchant_name + rounded amount with COUNT >= 3 and frequency inference

### Chat

- [ ] **CHAT-01**: Floating chat button (bottom-right) opens a chat drawer/modal
- [ ] **CHAT-02**: Chat message area with user/assistant bubbles and loading indicator
- [ ] **CHAT-03**: Suggestion chips for common queries on empty state
- [ ] **CHAT-04**: /api/chat route calls Anthropic API with MCP server for SQL queries
- [ ] **CHAT-05**: Claude generates SQL via execute_query tool and returns conversational response

### Layout & Mobile

- [x] **LAYO-01**: Single scrollable page with top nav bar (logo left, sign out right)
- [x] **LAYO-02**: Desktop: single column with max-width container
- [x] **LAYO-03**: Mobile: compact top nav, bottom tab bar for section jumps (Summary, Accounts, Transactions, Chat)
- [x] **LAYO-04**: Deployed to Vercel with environment variables configured

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
| FOUND-01 | Phase 1 | Complete |
| FOUND-02 | Phase 1 | Complete |
| FOUND-03 | Phase 1 | Complete |
| FOUND-04 | Phase 1 | Complete |
| FOUND-05 | Phase 1 | Complete |
| LAYO-01 | Phase 1 | Complete |
| LAYO-02 | Phase 1 | Complete |
| LAYO-03 | Phase 1 | Complete |
| LAYO-04 | Phase 1 | Complete |
| DASH-01 | Phase 2 | Complete |
| DASH-02 | Phase 2 | Complete |
| DASH-03 | Phase 2 | Complete |
| DASH-04 | Phase 2 | Complete |
| CHRT-01 | Phase 2 | Complete |
| CHRT-02 | Phase 2 | Complete |
| CHRT-03 | Phase 2 | Complete |
| CHRT-04 | Phase 2 | Complete |
| TXNS-01 | Phase 3 | Complete |
| TXNS-02 | Phase 3 | Complete |
| TXNS-03 | Phase 3 | Complete |
| TXNS-04 | Phase 3 | Complete |
| TXNS-05 | Phase 3 | Complete |
| RECR-01 | Phase 3 | Pending |
| RECR-02 | Phase 3 | Pending |
| RECR-03 | Phase 3 | Complete |
| CHAT-01 | Phase 4 | Pending |
| CHAT-02 | Phase 4 | Pending |
| CHAT-03 | Phase 4 | Pending |
| CHAT-04 | Phase 4 | Pending |
| CHAT-05 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 30 total
- Mapped to phases: 30
- Unmapped: 0

---
*Requirements defined: 2026-03-10*
*Last updated: 2026-03-10 after roadmap creation*
