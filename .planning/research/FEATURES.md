# Feature Landscape

**Domain:** Personal finance dashboard (read-only visualization layer over Plaid-powered backend)
**Researched:** 2026-03-10
**Confidence:** HIGH (well-established product category with many reference implementations)

## Table Stakes

Features users expect from any personal finance dashboard. Missing these and the app feels broken or incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Account balances overview | Every finance app shows balances front and center. This is literally the first thing users look for. | Low | Data already in `accounts` table -- `balance_current`, `balance_available`, `balance_limit`. Just display it. |
| Net worth / net position card | Copilot, Monarch, Lunch Money all show net position (assets minus liabilities). Without it, users mentally calculate across accounts. | Low | Sum depository balances minus credit balances minus loan balances. Single query. |
| Credit utilization display | Credit card users need to see balance vs. limit at a glance. Standard in every app that handles credit cards. | Low | `balance_current / balance_limit` per credit account. Show as progress bar. |
| Monthly spending total with comparison | "Am I spending more or less than last month?" is the most common financial question. Copilot highlights this on the home screen. | Low | SUM(amount) for current vs. previous month, calculate % change. |
| Spending by category breakdown | Donut/pie chart showing where money goes. Present in Copilot, Monarch, Mint (RIP), Rocket Money -- universally expected. | Medium | GROUP BY `category_primary`. Plaid provides categories automatically. Needs a good color palette for 8-12 categories. |
| Monthly spending trend chart | Bar or line chart showing spending over trailing 3-6 months. Users expect to see trajectory, not just a snapshot. | Medium | GROUP BY month over `date`. Recharts bar chart. Need to handle months with partial data (current month). |
| Transaction list with search | Browsable, searchable transaction history. Users need to find specific charges. Every finance app has this. | Medium | Full-text search on `merchant_name` and `name`. Pagination needed -- could have thousands of transactions. |
| Transaction filters | Filter by date range, category, account, amount range. Without filters, a long transaction list is unusable. | Medium | Multiple filter dimensions. Use URL query params for shareability. Filter chips for quick access. |
| Recent transactions on dashboard | Last 10-15 transactions visible on the overview page. Users want to see "what just happened" without navigating away. | Low | Simple query ordered by date DESC, LIMIT 15. |
| Dark mode | Fintech dashboard convention. Copilot, Linear, Arc all default dark. Financial data reads better on dark backgrounds. | Low | Tailwind dark mode class strategy. CSS variables for theming. Persist to localStorage. |
| Responsive/mobile-friendly layout | Users check finances on phones. If it does not work on mobile, it does not work. | Medium | Sidebar collapses to bottom nav or hamburger on mobile. Cards stack vertically. Tables become card lists. |
| Auth protection | Financial data on a public URL without auth is a dealbreaker. Even for a personal app. | Low-Med | Simple password gate (env var comparison) is sufficient for single-user. Not a full auth system. |

## Differentiators

Features that set this dashboard apart from generic finance apps. Not expected, but valuable -- especially because this project has a unique advantage (Claude + MCP chat).

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Natural language chat for financial queries** | This is the killer feature. No other personal finance app lets you ask arbitrary SQL-backed questions in plain English via Claude. "How much did I spend at gas stations in February?" -- answered instantly without pre-built reports. | High | Already architected: /api/chat -> Anthropic API -> MCP server -> Supabase. The hard part is the UX (streaming responses, tool use visibility, error handling, suggestion chips). |
| Recurring charge detection and display | Copilot and Monarch have this, but many simpler tools do not. Showing subscriptions with estimated monthly total gives immediate cost-awareness. | Medium | Custom detection logic: GROUP BY merchant_name + rounded amount, HAVING COUNT >= 3, infer frequency from date gaps. No Plaid Recurring Transactions API needed (paid add-on). |
| Suggestion chips on empty chat state | Pre-populated query ideas ("What are my top 5 merchants this month?", "How much did I spend on dining?") lower the barrier to using the chat feature. | Low | Static list of 6-8 common queries. Clicking one sends it as a message. |
| Per-account spending breakdown | Show spending per account (which credit card is getting the most use). Most apps aggregate -- showing per-account gives more granular insight. | Low | GROUP BY account_id with JOIN to accounts table. |
| Merchant logo display | Plaid provides `logo_url` for many merchants. Showing logos makes transaction lists scannable and feels polished. | Low | Already stored in transactions table. Fallback to merchant initial avatar when null. |
| Income vs. spending visualization | Show income (negative amounts in Plaid convention) alongside spending. Gives cash flow perspective beyond just "what did I spend." | Medium | Separate SUM for positive (spending) vs. negative (income) amounts. Side-by-side or stacked bar chart. |

## Anti-Features

Features to explicitly NOT build. Either out of scope, premature, or actively harmful to ship quality.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Budget setting / goal tracking | Scope creep. This is a Phase 3 concern per the project plan. Building budgets requires a write path the frontend does not have, plus UX for creating/editing budgets. | Let the chat feature answer budget-related questions conversationally. "Am I on track this month?" can be answered by comparing current spending to historical averages. |
| Plaid Link in the frontend | Bank connections are managed through the existing `link-account/` flow. Adding Plaid Link to the dashboard adds complexity, security concerns (access tokens), and is unnecessary for a single-user app. | Keep bank linking as a separate operational task. |
| Investment / retirement tracking | Out of scope per project plan. Different data model, different Plaid products, different visualization needs. | Focus on consumer credit, checking/savings, and loans -- the accounts already connected. |
| Multi-currency support | Single user in the US. All accounts are USD. Building multi-currency adds complexity for zero benefit. | Hardcode USD formatting. |
| Transaction editing / write operations | The frontend is read-only by design. MCP server only allows SELECT. Adding write capabilities means new API routes, new RLS policies, and security surface area. | Phase 2 includes category management which will introduce limited writes. Keep Phase 1 strictly read-only. |
| Push notifications | Requires service worker, push subscription management, server-side notification triggers. This is Phase 2 scope. | The dashboard itself provides passive awareness. Phase 2 adds proactive alerts. |
| Anomaly detection / smart alerts | Complex rules engine that needs tuning. Phase 2 scope. Premature without enough transaction history to establish baselines. | Chat can answer "any unusual charges this month?" on demand. |
| Real-time transaction streaming | Plaid webhooks already sync data. Adding WebSocket/SSE real-time updates to the frontend is over-engineering. Data refreshes on page load are sufficient. | Supabase queries on page load. Optional pull-to-refresh. Stale data is fine for a personal dashboard checked a few times a day. |
| Custom category taxonomy | Plaid's built-in categories are good enough for Phase 1. Custom categories require a new table, mapping UI, bulk operations. Phase 2 scope. | Use Plaid's `category_primary` and `category_detailed` as-is. |
| Data export (CSV/PDF) | Nice-to-have but not core. The chat feature can answer any analytical question. Export is a Phase 3 consideration. | If a user needs raw data, they can query via chat or go directly to Supabase. |

## Feature Dependencies

```
Auth gate ─────────────────────> ALL other features (nothing is accessible without auth)

Supabase connection ───────────> Dashboard page
                                 Transaction list
                                 Recurring detection

Dashboard page
  ├── Account balances overview
  ├── Net position card (requires account balances)
  ├── Credit utilization (requires account balances + balance_limit)
  ├── Monthly spending total (requires transaction queries)
  ├── Spending by category (requires transaction queries)
  ├── Monthly trend chart (requires transaction queries)
  └── Recent transactions (requires transaction queries)

Transaction list ──────────────> Transaction filters (filters enhance the list)
                                 Transaction search (search enhances the list)

Recurring detection ───────────> Recurring page display (detection logic feeds the UI)

/api/chat route ───────────────> Chat page UI (API must exist before UI can call it)
Chat page UI ──────────────────> Suggestion chips (enhancement to chat UI)

Theme toggle ──────────────────> (independent, can be built anytime)
Responsive layout ─────────────> (cross-cutting, applied to every page)
```

## MVP Recommendation

Build in this order, where each step produces a testable result:

**Priority 1 -- Core structure (build first):**
1. Auth gate -- nothing works without protecting the data
2. Supabase connection + data fetching layer
3. Layout shell (sidebar nav, theme toggle, responsive skeleton)

**Priority 2 -- Dashboard page (highest user value):**
4. Account balances + net position + credit utilization cards
5. Monthly spending total with month-over-month comparison
6. Spending by category donut chart
7. Monthly trend bar chart (trailing 6 months)
8. Recent transactions list on dashboard

**Priority 3 -- Transaction browser (second most used page):**
9. Full transaction list with pagination
10. Search and filters (date, category, account, amount)

**Priority 4 -- Recurring charges (quick win):**
11. Recurring detection SQL logic
12. Recurring page with merchant list and monthly total

**Priority 5 -- Chat (the differentiator, but depends on API route work):**
13. /api/chat route with Anthropic SDK + MCP
14. Chat UI with message bubbles, loading states
15. Suggestion chips for empty state

**Defer to Phase 2:** Push notifications, anomaly detection, category management, transaction editing.

**Defer to Phase 3:** Budget setting, goal tracking, data export, investment tracking.

## Sources

- [Key Features Every Personal Finance App Needs in 2026 - Financial Panther](https://financialpanther.com/key-features-every-personal-finance-app-needs-in-2026/)
- [Copilot Money](https://www.copilot.money/)
- [Copilot Money Review - Money with Katie](https://moneywithkatie.com/copilot-review-a-budgeting-app-that-finally-gets-it-right/)
- [Monarch Money - NerdWallet Review](https://www.nerdwallet.com/finance/learn/monarch-money-app-review)
- [Monarch Money](https://www.monarch.com)
- [Lunch Money Features](https://lunchmoney.app/features)
- [Fintech Dashboard Design - Merge Rocks](https://merge.rocks/blog/fintech-dashboard-design-or-how-to-make-data-look-pretty)
- [Fintech UX Design Best Practices - Wildnet Edge](https://www.wildnetedge.com/blogs/fintech-ux-design-best-practices-for-financial-dashboards)
- [Fintech Design Guide - Eleken](https://www.eleken.co/blog-posts/modern-fintech-design-guide)
- [Finance AI Chatbot Guide - GPTBots](https://www.gptbots.ai/blog/finance-ai-chatbot)
- [Plaid Recurring Transactions API](https://plaid.com/docs/api/products/transactions/)
- [The 7 Best Personal Finance Software Apps of 2026 - WalletHacks](https://wallethacks.com/best-personal-finance-software-apps/)
