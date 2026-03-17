# FinTrack — Complete Project Plan

## 1. Overview

FinTrack is a personal financial assistant with two layers:

1. **Backend (BUILT ✅):** Plaid ingests real bank data into Supabase via a DigitalOcean VPS webhook receiver. Claude queries that data conversationally through a custom MCP server with two tools: `execute_query` (read-only SQL) and `get_schema`.

2. **Frontend (TO BUILD):** A visual dashboard web app deployed to Vercel that visualizes spending data and provides a chat interface for natural language financial queries.

**Owner:** Abhi Singh (personal/household use only — not commercial)

---

## 2. Existing Backend System (COMPLETE)

### Architecture
```
Plaid → VPS (webhook receiver) → writes to Supabase
                                        ↑
              Claude → MCP server reads from Supabase
```

### Tech Stack (Backend)
| Component | Technology |
|---|---|
| Language | Node.js |
| Bank Connection | Plaid API (Production — Pay As You Go) |
| Database | Supabase (Postgres) — Project: "AI Finance Tracker" |
| Webhook Receiver | DigitalOcean VPS ($4/mo droplet), domain: claudefinancetracker.xyz |
| MCP Server (local) | Node.js, registered with Claude Desktop, stdio transport |
| MCP Server (remote) | Deployed at claudefinancetracker.xyz/mcp, authless, connected to claude.ai |

### Data Flow
1. Plaid webhook (SYNC_UPDATES_AVAILABLE) hits VPS
2. Verify webhook signature
3. Call /transactions/sync with access token
4. Receive added/modified/removed transactions + account balances
5. Store in Supabase
6. Data is ready to be queried

### Institutions
Currently connected: 1 institution (US Bank) — 2 checking accounts, 2 credit cards, 1 auto loan.
Future expansion to: Amex, Wells Fargo, Chase, Capital One, Bank of America. Consumer credit, lending, and checking/savings only — no investment or retirement accounts.

### Database Schema (Supabase — 4 tables)

**institutions** — Tracks each connected bank (one per Plaid Item).
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| plaid_item_id | text (unique) | Plaid's Item ID |
| plaid_access_token | text | Encrypted at app level before storing |
| institution_name | text | "Chase", "Amex", etc. |
| institution_id | text | Plaid's institution ID |
| sync_cursor | text | Latest /transactions/sync cursor |
| status | text | "active", "error", "login_required" |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**accounts** — Individual accounts within each institution.
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| plaid_account_id | text (unique) | |
| institution_id | uuid (FK → institutions) | |
| name | text | "Sapphire Reserve", "Platinum Checking" |
| official_name | text | Bank's official name for the account |
| type | text | "credit", "depository", "loan" |
| subtype | text | "credit card", "checking", "savings", etc. |
| mask | text | Last 4 digits |
| balance_available | numeric | |
| balance_current | numeric | |
| balance_limit | numeric | Credit limit (null for non-credit) |
| balance_updated_at | timestamptz | When balances were last refreshed |
| created_at | timestamptz | |

**transactions** — The main table. Most queries hit this.
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| plaid_transaction_id | text (unique) | |
| account_id | uuid (FK → accounts) | |
| amount | numeric | Positive = spending, Negative = income/refunds (Plaid convention) |
| date | date | Posted date |
| datetime | timestamptz | Precise timestamp when available |
| name | text | Raw bank description |
| merchant_name | text | Cleaned merchant name |
| merchant_entity_id | text | Stable Plaid merchant ID |
| category_primary | text | "FOOD_AND_DRINK", "ENTERTAINMENT" |
| category_detailed | text | "FOOD_AND_DRINK_RESTAURANTS" |
| payment_channel | text | "online", "in store", "other" |
| is_pending | boolean | |
| pending_transaction_id | text | Links to the pending version |
| iso_currency_code | text | "USD" |
| logo_url | text | Merchant logo |
| website | text | Merchant website |
| raw_data | jsonb | Full Plaid response for future reprocessing |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**sync_log** — Tracks every sync event for debugging.
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| institution_id | uuid (FK → institutions) | |
| transactions_added | int | |
| transactions_modified | int | |
| transactions_removed | int | |
| cursor_before | text | |
| cursor_after | text | |
| synced_at | timestamptz | |

### Indexes
- transactions(date), transactions(merchant_name), transactions(category_primary)
- transactions(account_id, date), transactions(amount), transactions(is_pending) partial
- sync_log(institution_id)

### Security
- RLS enabled on all 4 tables
- Only service_role key has access (anon key blocked)
- Auto-updating updated_at triggers on institutions and transactions tables

### MCP Server Design
Two tools:
- **execute_query** — runs read-only SQL (SELECT only) against Supabase
- **get_schema** — returns table structure so Claude knows what columns/tables exist

---

## 3. Frontend Dashboard (TO BUILD)

### Problem Statement
The current system works entirely through Claude's chat interface via a remote MCP server. While functional for ad-hoc queries, it lacks visual analytics, at-a-glance overviews, transaction browsing, recurring charge visibility, and proactive alerts.

### Goals

**Phase 1 (MVP):**
- Single-page scrollable dashboard with account balances, spending by category, monthly trends, recent transactions, and recurring charges
- Collapsible panels for dense sections (e.g. recent transactions, recurring)
- Natural language chat interface powered by Claude + MCP
- Dark theme only
- Password-protected with sign out
- Deployed to Vercel, accessible from any device
- Mobile-first with bottom tab bar navigation, top nav bar on desktop

**Phase 2 (Post-MVP):**
- PWA with push notifications for transaction alerts
- Anomaly detection (unusually large charges, new merchants above threshold, duplicate charges, category spending spikes)
- Alert rules engine (configurable thresholds)
- Transaction category management (recategorize transactions, create custom categories, bulk recategorize by merchant, auto-cleanup empty categories)

---

## 4. Frontend Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     WRITE PATH (existing)                    │
│                                                              │
│  Plaid ──webhook──▸ DigitalOcean VPS ──▸ Supabase (Postgres) │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                     READ PATH (new frontend)                 │
│                                                              │
│  Vercel (Next.js)                                            │
│    ├── Dashboard page ──▸ supabase-js ──▸ Supabase (direct)  │
│    └── Chat ──▸ /api/chat ──▸ Anthropic API                  │
│                                  │                           │
│                            MCP Server                        │
│                     (claudefinancetracker.xyz)                │
│                                  │                           │
│                           Supabase (SQL)                     │
└──────────────────────────────────────────────────────────────┘
```

The write path and read path are fully independent. The frontend never talks to Plaid or the VPS directly.

---

## 5. Frontend Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Framework | Next.js 14 (App Router) | Vercel-native, server components, API routes built in |
| Language | TypeScript | Type safety, better IDE support, portfolio signal |
| Styling | Tailwind CSS + shadcn/ui | Utility-first with pre-built accessible components |
| Charts | Recharts | Clean API, good financial chart defaults, React-native |
| Database client | supabase-js | Direct reads from frontend, already have the project |
| AI/Chat | Anthropic SDK (@anthropic-ai/sdk) | Server-side API route, calls MCP for financial queries |
| MCP | Remote MCP at claudefinancetracker.xyz/mcp | Existing authless MCP with execute_query + get_schema |
| Deployment | Vercel | Free tier, instant deploys from git, custom domain |
| Design tooling | Google Stitch + UI UX Pro Max + Nano Banana 2 | Screen design, design system intelligence, image assets |

---

## 6. Layout & Navigation

### Single Page Design
The app is a single scrollable page — no routing between separate pages. All financial data is visible by scrolling down. Dense sections (recent transactions, recurring charges) use collapsible panels to keep the page manageable.

### Page Structure (top to bottom)
1. **Top nav bar** — FinTrack logo/branding (left), sign out button (right)
2. **Summary cards** — Current month spending, last month (with % change), transaction count
3. **Account balances** — Net position card, individual account cards with credit utilization bars
4. **Monthly spending trend** — Bar chart, trailing 6 months
5. **Spending by category** — Donut chart with legend, current month
6. **Recent transactions** — Collapsible panel, last 30 transactions with merchant, amount, category, date, account. Searchable/filterable when expanded.
7. **Recurring charges** — Collapsible panel, auto-detected recurring merchants with amount, frequency, last charge date
8. **Chat** — Floating chat button (bottom-right) that opens a chat drawer/modal for natural language financial queries

### Desktop vs Mobile
- **Desktop:** Top nav bar, single column scrollable layout with max-width container
- **Mobile:** Top nav bar (compact), same scrollable layout optimized for touch, bottom tab bar for quick section jumps (Summary, Accounts, Transactions, Chat)

### Theme
- Dark theme only — no toggle, no light mode
- Copilot-style aesthetic: warm, approachable fintech with teal/cyan accent
- Neo-grotesque typography (Satoshi/General Sans)

---

## 7. Features

### 7.1 Authentication
- Simple password gate (env var on server)
- 30-day session via cookie/token
- Full-bleed gradient background with floating login card (3D/fancy aesthetic)
- Simple error message on wrong password, no lockout
- Sign out button in top nav bar — clears session and redirects to login

### 7.2 Summary Cards
- Current month spending total
- Last month spending total with percentage change (up/down indicator)
- Transaction count this month

### 7.3 Account Balances
- Net position card (cash − credit − loans)
- Individual account cards showing: account name, last 4 digits, balance, type
- Credit utilization bars for credit cards (with color coding: green/amber/red)

### 7.4 Monthly Spending Trend
- Bar chart, trailing 6 months
- Hover/tap for exact amounts
- Muted, harmonious color palette

### 7.5 Spending by Category
- Donut chart with legend
- Current month data
- Drill-down capable (click category to see transactions)
- 10+ distinct category colors

### 7.6 Recent Transactions (Collapsible)
- Default: collapsed showing count ("47 transactions this month")
- Expanded: searchable/filterable list
- Filters: merchant, category, amount range, date range, account
- Sort by date, amount, merchant
- Shows: merchant name, amount, category, date, account (last 4)

### 7.7 Recurring Charges (Collapsible)
- Default: collapsed showing monthly recurring total
- Expanded: list of recurring merchants
- Each entry: merchant name, amount, frequency (weekly/monthly/quarterly), last charge date, charge count
- Detection logic: GROUP BY merchant_name + rounded amount, HAVING COUNT >= 3, with frequency inference from date gaps

### 7.8 Chat
- Floating chat button (bottom-right)
- Opens a chat drawer/modal
- Chat message area with user/assistant bubbles
- Input textarea with send button
- Suggestion chips for common queries on empty state
- Loading indicator during API calls

**Data flow:**
1. User types question
2. Frontend POSTs to /api/chat with message history
3. API route calls Anthropic Messages API with MCP server config
4. Claude generates SQL via execute_query tool, gets results
5. Claude returns conversational response
6. Frontend displays response

**API route configuration:**
- Model: claude-sonnet-4-20250514
- MCP server: claudefinancetracker.xyz/mcp (authless)
- System prompt: financial assistant persona with schema awareness and Plaid amount conventions

---

## 8. Data Access & Security

### Dashboard reads (supabase-js)
- Uses Supabase anon key client-side
- Requires RLS policies allowing SELECT for anon role on accounts and transactions tables
- Alternative: use server-side API routes with service_role key (more secure, slightly more complex)

### Chat (Anthropic API)
- ANTHROPIC_API_KEY stored as Vercel environment variable (server-side only)
- MCP server URL stored as environment variable
- API route runs server-side — no API keys exposed to browser

### Access control
- Password gate protects entire app
- 30-day session cookie
- Sign out clears session
- No service_role key exposed to browser

---

## 9. Environment Variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# MCP
MCP_SERVER_URL=https://claudefinancetracker.xyz/mcp

# Auth
AUTH_PASSWORD=
```

---

## 10. Design Direction

**Layout:** Single scrollable page, top nav bar, collapsible panels for dense sections
**Aesthetic:** Copilot-style — warm, approachable fintech with rounded cards, soft gradients
**Theme:** Dark only
**Accent color:** Teal/cyan
**Typography:** Neo-grotesque (Satoshi/General Sans)
**Charts:** Muted, harmonious palette with clear data hierarchy, 10+ category colors
**Login:** Full-bleed gradient background with floating 3D-style login card
**Mobile:** Bottom tab bar for section jumps, top nav compact
**Design system:** Generated by UI UX Pro Max skill for fintech/personal finance/dashboard context
**Screen mockups:** Created in Google Stitch, pulled into Claude Code via Stitch MCP
**Assets:** Generated via Nano Banana 2 (integrated in Stitch)

---

## 11. Build Order

Each step produces a working, testable result before moving to the next.

1. **Project initialization** — Next.js 14, TypeScript, Tailwind, shadcn/ui, project structure
2. **Design system generation** — UI UX Pro Max design system for fintech dashboard (dark theme, teal/cyan, Satoshi font)
3. **Screen design in Stitch** — Single page layout with all sections, login page, mobile view
4. **Auth + login page** — Password gate, 30-day session, full-bleed login card, sign out
5. **Top nav + layout shell** — Nav bar with logo + sign out, scrollable single-page container
6. **Supabase connection** — supabase-js client, test read from accounts table
7. **Summary cards + account balances** — Top section of dashboard with real data
8. **Charts** — Monthly spending trend (bar) + spending by category (donut)
9. **Recent transactions** — Collapsible panel with search/filter
10. **Recurring charges** — Collapsible panel with detection logic
11. **Chat** — /api/chat route with Anthropic SDK + MCP, floating chat button + drawer UI
12. **Mobile optimization** — Bottom tab bar, responsive layout, touch targets
13. **Deploy to Vercel** — Environment variables, production build

---

## 12. Phase 2 Scope (Post-MVP)

### PWA Push Notifications
- Service worker registration
- Push subscription management
- Notification trigger: VPS webhook receiver runs alert checks after each Plaid sync
- Notification delivery: Web Push API via service worker

### Anomaly Detection
- Rules engine running on VPS after each transaction sync
- Rule types: amount threshold (> X% of category average), new merchant above threshold, duplicate charge detection (same merchant + amount within 24h), category spending spike (> X% above monthly average)
- Alerts stored in new Supabase table, surfaced in dashboard + push notification

### Transaction Category Management
- Recategorize individual transactions (change category_primary/category_detailed)
- Create custom categories beyond Plaid's taxonomy
- Bulk recategorize all transactions from a specific merchant
- Auto-cleanup: categories with zero linked transactions drop from UI
- Writes to Supabase via Next.js API routes (not through MCP)
- Requires new custom_categories table in Supabase

---

## 13. Example Queries (for Chat feature context)

| Natural Language | SQL |
|---|---|
| "How much did I spend on dining this month?" | SELECT SUM(amount) FROM transactions WHERE category_primary = 'FOOD_AND_DRINK' AND date >= date_trunc('month', CURRENT_DATE) |
| "Total credit card balance across all cards?" | SELECT SUM(balance_current) FROM accounts WHERE type = 'credit' |
| "All Amazon transactions over $50?" | SELECT * FROM transactions WHERE merchant_name = 'Amazon' AND amount > 50 |
| "What are my recurring subscriptions?" | SELECT merchant_name, amount, COUNT(*) FROM transactions GROUP BY merchant_name, amount HAVING COUNT(*) >= 3 |
| "Month over month spending?" | SELECT date_trunc('month', date) AS month, SUM(amount) FROM transactions GROUP BY 1 ORDER BY 1 |

---

## 14. Success Criteria

- Dashboard loads in < 2 seconds with real data
- All financial data displays correctly (amounts, dates, categories)
- Chat interface successfully answers natural language financial questions via MCP
- Single page scrolls smoothly with collapsible panels working correctly
- Deployed and accessible on mobile and desktop
- No financial data exposed to unauthorized users
- Sign out works and clears session

---

## 15. Out of Scope

- Multi-user support
- Light theme / theme toggle
- Multi-page routing (single page only)
- Plaid Link flow in the frontend (bank connections managed separately)
- Investment or retirement account tracking
- Budget setting or goal tracking (Phase 3 potential)
- Native mobile app (PWA covers mobile access)

---

## 16. Design Decisions (Backend — for context)

- **raw_data JSONB column** — stores full Plaid response per transaction for future-proofing
- **Read-only SQL only** — MCP server restricts to SELECT so Claude can never modify financial data
- **Supabase over self-hosted Postgres** — no database management on VPS, free tier sufficient
- **No Balance product** — balances from /transactions/sync are fresh enough for end-of-day summaries
- **No Recurring Transactions product** — Claude can detect patterns from transaction history via SQL
- **Webhook architecture over polling** — real-time data at no extra cost
- **NLP to SQL over predefined tools** — maximum query flexibility, MCP server stays thin
