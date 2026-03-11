# Feature Research

**Domain:** Personal finance dashboard (single-user, read-only over Plaid-ingested bank data)
**Researched:** 2026-03-10
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Account overview with balances | Every finance app (Mint, Monarch, Empower) shows all accounts and balances on the main screen. This is the first thing users look for. | LOW | Pull from `accounts` table. Show institution grouping, account type icons, last-synced timestamp. Credit utilization bars for credit cards are standard. |
| Current month spending summary | Users need a single number answering "how much have I spent this month?" Monarch and Empower both lead with this. | LOW | Aggregate positive amounts from `transactions` for current month. Show vs. last month with % change -- this context is what makes the number useful. |
| Monthly spending trend chart | Bar chart showing trailing 6 months of spending is the standard view in Monarch, Simplifi, and Empower. Users expect to see the trajectory, not just a snapshot. | MEDIUM | Recharts bar chart. Group by month, sum positive transaction amounts. Needs date range query and month bucketing. |
| Spending by category breakdown | Donut/pie chart with category drill-down is universal in every finance app. Plaid provides `category_primary` which maps cleanly to this. | MEDIUM | Donut chart with click-to-drill. Plaid categories (Food & Drink, Shopping, Transportation, etc.) are the grouping key. Top 6-8 categories + "Other" bucket. |
| Transaction list with search and filter | Browsing transactions is the second most common action after checking balances. Monarch, Rocket Money, and PocketGuard all have searchable, filterable transaction views. | MEDIUM | Paginated or virtual-scrolled list. Filter by date range, category, account. Search by merchant name. Sort by date (default) or amount. |
| Recurring charge detection | Post-Mint, recurring/subscription tracking is now expected. Rocket Money, Monarch, and PocketGuard all auto-detect recurring charges. Users want to see what they pay monthly without thinking about it. | HIGH | Pattern detection: group transactions by merchant, find regular intervals (monthly, weekly, annual). Flag confidence level. This is the hardest table-stakes feature -- needs a detection algorithm. |
| Net position / net worth display | Single number: total assets minus total liabilities. Empower and Monarch show this prominently. For FinTrack with checking + credit + auto loan, this is straightforward. | LOW | Sum account balances by type: checking/savings positive, credit/loan negative. Display as a single card. |
| Mobile-responsive layout | Users access finance apps on 2.7 devices on average. A dashboard that breaks on mobile is unusable. | MEDIUM | Already scoped: bottom tab bar for section jumps on mobile. Collapsible panels need to work well on small screens. Single-column stack on mobile vs. grid on desktop. |
| Secure authentication | Even a personal app needs a gate. Seeing financial data behind no auth feels wrong. | LOW | Already scoped as password gate with 30-day session. Simple but sufficient for single-user. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Natural language chat interface (Claude + MCP) | This is FinTrack's primary differentiator. No consumer finance app lets you ask arbitrary SQL-powered questions about your data in natural language. Monarch has basic AI insights, Cleo has a chatbot, but neither can answer "what did I spend at restaurants in December vs January?" on the fly. | HIGH | Floating button + drawer. Anthropic API route (server-side) calling existing MCP server. The MCP server already has `execute_query` and `get_schema` -- Claude generates SQL from natural language. Streaming responses for UX. |
| Single-page scrollable dashboard | Most finance apps use tab-based navigation (accounts tab, transactions tab, budgets tab). A single scrollable page with collapsible sections gives "everything at a glance" -- closer to a Bloomberg terminal than a consumer app. This is opinionated and fast. | MEDIUM | Collapsible panels with smooth animations. Section anchoring via bottom nav on mobile, sidebar on desktop. The key is information density without overwhelm. |
| Dark-only Copilot-style aesthetic | Most finance apps use light/corporate themes. A dark, teal-accented, fintech-forward design feels premium and distinct. This is a taste differentiator, not a feature one. | LOW | Already committed to in design direction. Consistent dark theme with teal/cyan accent throughout. |
| Transaction count as a metric | Showing "142 transactions this month" alongside spending total gives a behavioral signal most apps ignore. High transaction count + moderate spending = lots of small purchases (coffee, subscriptions). | LOW | Simple count query. Display alongside spending summary card. Subtle but insightful. |
| Credit utilization visualization | Bar/gauge showing credit used vs. credit limit per card. Empower does this, most others do not. For users with multiple credit cards, this is immediately useful. | LOW | Calculate from `accounts` table: current_balance / credit_limit. Color-code: green < 30%, yellow 30-50%, red > 50%. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems. Deliberately NOT building these.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Budget setting / goal tracking | Every "serious" finance app has budgets. YNAB is built entirely on this. | Budgeting is a full product, not a feature. It requires category management, rollover logic, goal types, progress tracking, notifications. It doubles the scope of the app and moves FinTrack from "dashboard" to "budgeting tool." The chat interface partially fills this need -- users can ask "am I spending more on food this month?" | Defer to Phase 3 as noted in PROJECT.md. The chat interface answers budget-like questions without the overhead of a budgeting system. |
| Investment / retirement tracking | Empower's main draw is investment tracking. Users with brokerage accounts want portfolio views. | Out of scope per PROJECT.md -- FinTrack connects consumer credit, checking, and savings only. Investment tracking needs different data models (holdings, cost basis, performance calculation) and Plaid Investment endpoints. It is a different product. | Keep out of scope entirely. If investment accounts connect later, show balances only -- no portfolio analysis. |
| Plaid Link flow in frontend | Users might want to add new bank accounts from the dashboard. | Plaid Link adds significant complexity: token exchange flow, error handling, re-authentication, institution search UI. Bank connections are infrequent (once per institution) and currently managed separately. Not worth the frontend complexity for a personal app. | Continue managing bank connections via separate flow. |
| Multi-user / household support | Monarch supports shared finances for couples. | Requires user management, permission models, shared vs. personal accounts, invitation flow. Massive scope increase for a personal dashboard. | Single-user only. If household use is needed, share the single password. |
| Real-time transaction syncing | Users might want instant updates when they swipe a card. | Plaid webhooks already handle this on the backend. Adding real-time UI updates (WebSocket, polling) adds complexity for minimal value -- most people check their dashboard once or twice a day, not after every purchase. | Show "last synced" timestamp. Data freshness comes from the existing Plaid webhook pipeline. |
| Transaction category editing / re-categorization | Mint let users re-categorize transactions. Monarch supports custom categories. | Category management is a rabbit hole: custom categories, merge rules, machine learning to auto-apply, bulk re-categorize. For a read-only dashboard, Plaid's categories are good enough. | Use Plaid categories as-is. If a specific question about miscategorized transactions comes up, the chat interface can handle it ("ignore that $500 Venmo from my restaurant spending"). |
| Anomaly detection / smart alerts | Rocket Money and PocketGuard send alerts for unusual spending. | Requires defining "unusual," threshold configuration, notification delivery (email? push? in-app?), alert history, false positive management. Phase 2 feature per PROJECT.md. | Defer to Phase 2. The chat interface can answer "did I spend more than usual this month?" on demand. |
| Light theme / theme toggle | Accessibility concern, some users prefer light themes. | Already decided: dark only. Adding a theme toggle doubles the design/testing surface for every component. Personal app -- Abhi's preference is dark. | Dark only. If accessibility is needed later, it is a Phase 3 concern. |

## Feature Dependencies

```
[Auth / Password Gate]
    |
    v
[Supabase Data Layer] (server-side queries)
    |
    +---> [Account Overview Cards]
    |         |
    |         +---> [Net Position Display]
    |         +---> [Credit Utilization Bars]
    |
    +---> [Spending Summary Cards]
    |         |
    |         +---> [Monthly Trend Chart] (same query pattern, different aggregation)
    |
    +---> [Category Breakdown Chart]
    |         |
    |         +---> [Category Drill-down] (click handler on chart segments)
    |
    +---> [Transaction List]
    |         |
    |         +---> [Search / Filter Controls]
    |
    +---> [Recurring Detection]
    |         (depends on transaction history depth)
    |
    +---> [Chat Interface]
              |
              +---> [Anthropic API Route] (server-side)
                        |
                        +---> [MCP Server Connection]
```

### Dependency Notes

- **Everything requires Auth + Supabase Data Layer:** No feature works without data access and the password gate.
- **Account Overview is independent of Spending/Transactions:** These can be built in parallel.
- **Category Drill-down requires Category Chart:** Drill-down is an enhancement on top of the donut chart, not a separate feature.
- **Recurring Detection requires Transaction List data:** Same data source, but recurring detection needs the pattern-matching algorithm on top. Build transactions first, recurring second.
- **Chat Interface is fully independent:** It uses MCP, not the same Supabase queries as the dashboard. Can be built in any order, but it is the highest-complexity differentiator -- build it after core dashboard is stable.
- **Monthly Trend Chart and Spending Summary share query patterns:** Build spending summary first (simpler), then extend to trend chart.

## MVP Definition

### Launch With (v1)

Minimum viable product -- what's needed to see real financial data on screen.

- [ ] Password gate with 30-day session -- security baseline
- [ ] Account balance cards with net position -- "are my accounts healthy?"
- [ ] Current month spending summary with % change vs. last month -- "how am I doing?"
- [ ] Monthly spending trend bar chart (6 months) -- "which direction am I trending?"
- [ ] Spending by category donut chart -- "where is my money going?"
- [ ] Transaction list with search and filter -- "show me the details"
- [ ] Mobile-responsive layout -- usable on phone
- [ ] Dark theme styling -- the aesthetic identity

### Add After Validation (v1.x)

Features to add once core dashboard is working and data flows are proven.

- [ ] Recurring charge detection panel -- once transaction data is flowing and proven reliable, add pattern detection
- [ ] Chat interface (Claude + MCP) -- the primary differentiator, but add after dashboard is stable so you have something to compare AI answers against
- [ ] Credit utilization bars on account cards -- visual enhancement, easy to add
- [ ] Category drill-down (click donut segment to see transactions) -- interaction refinement

### Future Consideration (v2+)

Features to defer until the dashboard is daily-driver stable.

- [ ] Anomaly detection / smart alerts -- Phase 2 per PROJECT.md
- [ ] PWA push notifications -- Phase 2 per PROJECT.md
- [ ] Transaction category management -- Phase 2 per PROJECT.md
- [ ] Budget setting / goal tracking -- Phase 3 per PROJECT.md
- [ ] Multi-institution expansion (Amex, Chase, etc.) -- backend work, not frontend features

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Password gate + session | HIGH | LOW | P1 |
| Account balance cards + net position | HIGH | LOW | P1 |
| Spending summary (current vs. last month) | HIGH | LOW | P1 |
| Monthly spending trend chart | HIGH | MEDIUM | P1 |
| Category breakdown donut chart | HIGH | MEDIUM | P1 |
| Transaction list with search/filter | HIGH | MEDIUM | P1 |
| Mobile-responsive layout | HIGH | MEDIUM | P1 |
| Recurring charge detection | HIGH | HIGH | P2 |
| Chat interface (Claude + MCP) | HIGH | HIGH | P2 |
| Credit utilization bars | MEDIUM | LOW | P2 |
| Category drill-down | MEDIUM | LOW | P2 |
| Transaction count metric | LOW | LOW | P2 |
| Anomaly detection / alerts | MEDIUM | HIGH | P3 |
| Budget setting / goals | MEDIUM | HIGH | P3 |

## Competitor Feature Analysis

| Feature | Monarch Money | Empower | Rocket Money | FinTrack Approach |
|---------|---------------|---------|--------------|-------------------|
| Account overview | Multi-tab, customizable widgets | Investment-focused dashboard | Account list with net worth | Single-page scrollable, all accounts visible at once |
| Spending charts | Monthly reports, category breakdown, customizable | Basic spending wheel | Spending by category and merchant | Recharts bar + donut, 6-month trend, dark theme |
| Transaction browsing | Full list, editable categories, custom tags | Basic list, limited filtering | List with subscription highlighting | Read-only list with search, filter by date/category/account |
| Recurring detection | Auto-detect, calendar + list view, 3-day reminders | Not a focus | Core feature, can cancel subscriptions for you | Auto-detect from transaction patterns, list view, no cancellation service |
| AI / Chat | Basic AI insights, weekly recap | None | None | Full natural language chat via Claude + MCP -- ask anything about your financial data |
| Budgeting | Full budget system with categories and rollover | Basic budget feature | Budget tracking with alerts | Not in v1 -- chat interface handles ad-hoc budget questions |
| Design | Light theme, clean but corporate | Light theme, investment-focused | Light theme, subscription-focused | Dark-only, teal/cyan accent, Copilot-style -- distinct aesthetic |
| Price | $14.99/month | Free (upsells advisory) | Free tier + $6-12/month premium | Free (personal project) |

## Sources

- [Personal Finance Apps: What Users Expect in 2025](https://www.wildnetedge.com/blogs/personal-finance-apps-what-users-expect-in-2025) -- user expectations survey
- [Monarch Money features](https://www.monarch.com/features/tracking) -- competitor feature set
- [Monarch dashboard customization](https://help.monarch.com/hc/en-us/articles/360058127551-Customizing-Your-Dashboard) -- dashboard widget patterns
- [Monarch recurring tracking](https://help.monarch.com/hc/en-us/articles/4890751141908-Tracking-Recurring-Expenses-and-Bills) -- recurring detection patterns
- [Rob Berger: Mint alternatives](https://robberger.com/mint-alternatives/) -- competitive landscape
- [10 Must-Try Features in Personal Finance Apps Today](https://www.numberanalytics.com/blog/must-try-features-personal-finance-apps-today) -- feature expectations
- [The State of Personal Finance Apps in 2025](https://bountisphere.com/blog/personal-finance-apps-2025-review) -- market overview
- [Top 10 AI Personal Finance Assistant Tools](https://www.bestdevops.com/top-10-ai-personal-finance-assistants-tools-in-2025-features-pros-cons-comparison/) -- AI chat feature landscape
- [PocketGuard recurring tracker](https://pocketguard.com/recurring/) -- recurring detection UX patterns

---
*Feature research for: Personal finance dashboard (FinTrack)*
*Researched: 2026-03-10*
