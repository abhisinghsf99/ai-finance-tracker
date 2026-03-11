# Requirements: FinTrack Frontend Dashboard

**Defined:** 2025-03-10
**Core Value:** At-a-glance financial visibility — see balances, spending trends, and category breakdowns without asking Claude a question every time.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Foundation

- [x] **FOUND-01**: User sees a Next.js 15 app with TypeScript, Tailwind CSS, and shadcn/ui components
- [x] **FOUND-02**: User must enter a password to access the app (middleware-based gate, session cookie)
- [x] **FOUND-03**: All data fetched server-side via Supabase service_role key (never exposed to browser)
- [ ] **FOUND-04**: User navigates between pages via sidebar navigation that collapses on mobile
- [x] **FOUND-05**: User can toggle between dark (default) and light theme, preference persisted to localStorage

### Dashboard

- [ ] **DASH-01**: User can see individual account cards with current balance, type, and institution
- [ ] **DASH-02**: User can see net position card showing total cash minus total credit minus total loans
- [ ] **DASH-03**: User can see credit utilization bars (balance vs. limit) for each credit card
- [ ] **DASH-04**: User can see a circle chart showing spending by category for the last 2 weeks
- [ ] **DASH-05**: User can see and expand a recent transactions list limited to last 30 days
- [ ] **DASH-06**: User sees automated flags on suspicious transactions based on spending history (unusually large amounts, new merchants above threshold, duplicate charges)

### Transactions

- [ ] **TXNS-01**: User can browse all transactions with search by merchant name or raw description
- [ ] **TXNS-02**: User can filter transactions by date range, category, account, and amount range

### Recurring

- [ ] **RECR-01**: User can see auto-detected recurring charges with merchant name, amount, frequency (weekly/monthly/quarterly), and last charge date
- [ ] **RECR-02**: User can see estimated monthly recurring total at top of page

### Chat

- [ ] **CHAT-01**: User can ask natural language financial questions that are answered via Claude + remote MCP server
- [ ] **CHAT-02**: User sees chat interface with message bubbles, loading indicator, and conversational responses
- [ ] **CHAT-03**: User sees smart suggestion chips based on recent queries from query_log table

### Deployment

- [ ] **DEPL-01**: App is deployed to Vercel with all environment variables configured
- [ ] **DEPL-02**: App works correctly on both mobile and desktop browsers

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Notifications

- **NOTF-01**: User receives push notifications for transaction alerts (PWA + service worker)
- **NOTF-02**: User can configure notification thresholds and preferences

### Anomaly Detection

- **ANOM-01**: Rules engine detects amount spikes, new merchants, duplicate charges, category spending spikes
- **ANOM-02**: Alerts stored in Supabase table and surfaced in dashboard + push notification

### Category Management

- **CATM-01**: User can recategorize individual transactions
- **CATM-02**: User can create custom categories beyond Plaid taxonomy
- **CATM-03**: User can bulk recategorize all transactions from a specific merchant

### Analytics

- **ANLT-01**: Monthly spending trend chart (trailing 6 months)
- **ANLT-02**: Income vs. spending visualization (cash flow)
- **ANLT-03**: Per-account spending breakdown

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-user support | Personal app, single user |
| Plaid Link in frontend | Bank connections managed via existing link-account flow |
| Investment/retirement tracking | Different data model, different Plaid products |
| Multi-currency | Single user in US, all accounts USD |
| Transaction editing/writes | Frontend is read-only by design in v1 |
| Budget setting/goal tracking | Phase 3 potential, requires write path |
| Native mobile app | PWA covers mobile access |
| Real-time streaming updates | Page-load queries sufficient for personal use |
| Data export (CSV/PDF) | Chat can answer analytical questions; Supabase available for raw data |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Complete |
| FOUND-02 | Phase 1 | Complete |
| FOUND-03 | Phase 1 | Complete |
| FOUND-04 | Phase 1 | Pending |
| FOUND-05 | Phase 1 | Complete |
| DASH-01 | Phase 2 | Pending |
| DASH-02 | Phase 2 | Pending |
| DASH-03 | Phase 2 | Pending |
| DASH-04 | Phase 2 | Pending |
| DASH-05 | Phase 2 | Pending |
| DASH-06 | Phase 2 | Pending |
| TXNS-01 | Phase 2 | Pending |
| TXNS-02 | Phase 2 | Pending |
| RECR-01 | Phase 3 | Pending |
| RECR-02 | Phase 3 | Pending |
| CHAT-01 | Phase 3 | Pending |
| CHAT-02 | Phase 3 | Pending |
| CHAT-03 | Phase 3 | Pending |
| DEPL-01 | Phase 4 | Pending |
| DEPL-02 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0

---
*Requirements defined: 2025-03-10*
*Last updated: 2026-03-10 after roadmap creation*
