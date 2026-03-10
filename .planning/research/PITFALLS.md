# Domain Pitfalls

**Domain:** Personal fintech dashboard (Next.js + Supabase + Plaid data + Anthropic chat)
**Researched:** 2026-03-10
**Overall confidence:** HIGH (verified against official docs, project source code, and community reports)

## Critical Pitfalls

Mistakes that cause rewrites, data exposure, or broken core functionality.

---

### Pitfall 1: Exposing the Supabase Service Role Key to the Browser

**What goes wrong:** The existing backend uses `service_role` key everywhere (webhook, MCP server) because those run on trusted servers. When building the Next.js frontend, the instinct is to reuse the same key -- but if it leaks to the client bundle, anyone can bypass RLS and read/write all financial data.

**Why it happens:** The project currently has RLS policies that ONLY allow `service_role` access. No `anon` or `authenticated` policies exist. Developers copy the working pattern from the webhook server into the frontend without realizing Next.js bundles `NEXT_PUBLIC_*` vars into client JS.

**Consequences:** Full read/write access to all tables -- institutions (including Plaid access tokens), accounts, transactions. A leaked `service_role` key is equivalent to giving away database admin credentials.

**Prevention:**
1. NEVER prefix the service role key with `NEXT_PUBLIC_`. Store it as `SUPABASE_SERVICE_ROLE_KEY` (server-only env var).
2. Create a server-side Supabase client (in API routes / Server Components) that uses the service role key.
3. Create a separate browser client using only the `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. For dashboard data pages: fetch in Server Components using the service role client (keeps the key server-side), or add RLS read policies for `authenticated` role and use the anon key with auth.

**Detection:** Search codebase for `NEXT_PUBLIC_SUPABASE_SERVICE` -- if this string exists anywhere, it is a leak.

**Phase:** Must be addressed in Phase 1 (project scaffolding / Supabase client setup).

**Source:** [Supabase API Keys docs](https://supabase.com/docs/guides/api/api-keys), [Securing your API](https://supabase.com/docs/guides/api/securing-your-api)

---

### Pitfall 2: Auth Gate That Only Checks on the Client

**What goes wrong:** The auth protection uses `supabase.auth.getSession()` in a Server Component or middleware to gate access. This is spoofable -- the session comes from cookies which can be forged. The page renders sensitive financial data to anyone who crafts a valid-looking cookie.

**Why it happens:** `getSession()` is faster and simpler than `getUser()`. Many tutorials use it. Developers don't realize it only reads the local JWT without validating it against Supabase Auth servers.

**Consequences:** Unauthorized access to financial data. For a personal app this risk is lower (single user, likely not a target), but it is still a bad pattern that could bite if the app is ever shared or exposed.

**Prevention:**
1. Use `supabase.auth.getUser()` in middleware and Server Components -- this makes a round-trip to Supabase Auth to validate the token.
2. In `middleware.ts`, call `getUser()` and redirect to `/login` if it fails.
3. Never trust `getSession()` alone for protecting server-side routes.

**Detection:** Grep for `getSession()` in middleware or server code without an accompanying `getUser()` call.

**Phase:** Phase 1 (auth gate setup).

**Source:** [Supabase Next.js SSR Auth docs](https://supabase.com/docs/guides/auth/server-side/nextjs)

---

### Pitfall 3: Chat API Route Timeout on Vercel Free Tier

**What goes wrong:** The `/api/chat` route calls Anthropic API, which calls the remote MCP server at `claudefinancetracker.xyz/mcp`, which queries Supabase. This chain can easily exceed 10 seconds -- especially when Claude decides to call `get_schema` first, then `execute_query`, then format a response. The Vercel Hobby tier kills serverless functions at 10 seconds.

**Why it happens:** LLM API calls with tool use involve multiple round trips. Claude may call the MCP tool 2-3 times in a single conversation turn. Each MCP call goes: Vercel -> Anthropic -> MCP server -> Supabase -> MCP server -> Anthropic -> Vercel. The cumulative latency frequently exceeds 10s.

**Consequences:** Chat responses are cut off mid-stream. Users see "Function timeout" errors. The most valuable feature of the app (natural language financial queries) becomes unreliable.

**Prevention:**
1. Use streaming responses (`stream: true` in the Anthropic SDK). Vercel Edge Functions can stream for up to 300 seconds as long as the first byte arrives within 25 seconds.
2. Move the chat API route to an Edge Function (`export const runtime = 'edge'`) to get longer streaming timeouts.
3. Use Claude 3.5 Haiku for chat queries (faster responses, cheaper, sufficient for SQL generation).
4. Pre-load schema context in the system prompt instead of having Claude call `get_schema` every turn. This eliminates one MCP round trip.

**Detection:** Test the chat with a complex financial question (e.g., "What are my top 5 spending categories this month compared to last month?"). If it times out or truncates, the timeout is the issue.

**Phase:** Phase 3 (chat interface implementation). This is the single most likely phase to need debugging.

**Source:** [Vercel Functions Limitations](https://vercel.com/docs/functions/limitations), [Anthropic Rate Limits](https://docs.anthropic.com/en/api/rate-limits)

---

### Pitfall 4: Plaid Amount Sign Convention Confusion

**What goes wrong:** Plaid uses positive amounts for money leaving the account (expenses) and negative for money entering (income/refunds). Developers display amounts as-is, leading to charts showing "negative spending" for income, or income being summed into spending totals. Category breakdowns become nonsensical.

**Why it happens:** The existing `transactions` table stores amounts using Plaid's convention directly (confirmed in webhook code: `amount: t.amount`). This is correct for storage but confusing for display. Most users expect positive = income and negative = expense (bank statement convention), or they expect separate expense/income views.

**Consequences:** Dashboard cards show wrong totals. "Total spending" includes refunds as negative numbers, understating actual spend. Charts have confusing negative bars. Recurring charge detection misidentifies income as expenses.

**Prevention:**
1. Decide on a display convention early and document it. Recommendation: keep Plaid convention in DB, transform at the query/display layer.
2. Create a utility function: `displayAmount(amount, type)` that handles the flip for the UI.
3. For spending queries: filter to `amount > 0` (Plaid convention = money out).
4. For income queries: filter to `amount < 0` and negate for display.
5. Add a comment in the codebase explaining the convention near every amount display.

**Detection:** Look at the dashboard summary card for "Total Spending" -- if it shows a lower number than expected, refunds/income are being subtracted.

**Phase:** Phase 2 (dashboard charts and summary cards). Must be established before any amount display logic.

**Source:** [Plaid Transactions API docs](https://plaid.com/docs/api/products/transactions/)

---

### Pitfall 5: Pending Transaction Double-Counting

**What goes wrong:** Pending and posted transactions are displayed together, causing the same charge to appear twice. Worse, pending amounts often differ from posted amounts (e.g., restaurant charges before tip), so totals are wrong in two ways: duplicated AND with the wrong amount.

**Why it happens:** The database stores both pending and posted transactions. The webhook handles the lifecycle correctly (Plaid sends modified/removed events when pending becomes posted), but the frontend query may pull both if it doesn't filter on `is_pending`. During the 1-5 day window before posting, both versions exist.

**Consequences:** Spending totals are inflated. Transaction lists show duplicates. Charts are inaccurate. Users lose trust in the dashboard's accuracy.

**Prevention:**
1. Default transaction queries to `WHERE is_pending = false` for all summary/chart data.
2. Show pending transactions separately with a visual indicator (badge, muted style).
3. On the transactions list page, show pending with a "Pending" badge but exclude from totals.
4. For recurring charge detection: only use posted transactions.

**Detection:** Check if the transaction count on the dashboard is notably higher than expected. Look for transactions with the same merchant on the same date with slightly different amounts.

**Phase:** Phase 2 (transactions page and dashboard).

**Source:** [Plaid Transaction States docs](https://plaid.com/docs/transactions/transactions-data/)

---

## Moderate Pitfalls

Issues that cause significant rework or degraded UX but won't break the app.

---

### Pitfall 6: Fetching All Transactions for Charts Instead of Aggregating Server-Side

**What goes wrong:** The frontend fetches thousands of raw transactions and aggregates them in JavaScript (grouping by category, summing by month). With 5 accounts over several months, you easily have 1,000+ transactions. This slows initial page load and makes Recharts sluggish.

**Why it happens:** It is the simplest code to write. `supabase.from('transactions').select('*')` then `.reduce()` in the component. Works fine with 50 transactions, breaks down at scale.

**Prevention:**
1. Write SQL aggregation queries in Server Components or API routes: `SELECT category_primary, SUM(amount) FROM transactions WHERE amount > 0 GROUP BY category_primary`.
2. For time-series charts: aggregate by week/month in SQL using `date_trunc()`.
3. Only fetch raw transaction rows for the transaction list page (with pagination).
4. Use Supabase's `.rpc()` for complex aggregations if needed.

**Detection:** If the dashboard page takes more than 2 seconds to load or Recharts animations stutter, you are likely sending too much raw data.

**Phase:** Phase 2 (dashboard charts).

---

### Pitfall 7: Server/Client Component Boundary Confusion

**What goes wrong:** Developers mark a page as `"use client"` to use Recharts or interactive filters, then realize they cannot use the Supabase server client (which needs server-side env vars) in that component. They either expose the service key or refactor the entire page.

**Why it happens:** Recharts components require client-side rendering. Interactive elements (filters, toggles) require client-side state. It feels natural to make the whole page a Client Component. But then you lose Server Component benefits (server-side data fetching, no client bundle bloat, secure env var access).

**Prevention:**
1. Pattern: Server Component page fetches data, passes it as props to a Client Component chart/table.
2. `app/dashboard/page.tsx` (Server Component) -> fetches aggregated data -> renders `<DashboardCharts data={data} />` (Client Component with `"use client"`).
3. For interactive filters: use URL search params (`useSearchParams`) and refetch in the Server Component via the URL, or use a client-side filter on pre-fetched data.
4. Never put `"use client"` on `page.tsx` or `layout.tsx` files.

**Detection:** If `page.tsx` files have `"use client"` at the top, the boundary is wrong.

**Phase:** Phase 1 (project structure), reinforced in Phase 2 (every page).

**Source:** [Vercel blog: Common Next.js App Router mistakes](https://vercel.com/blog/common-mistakes-with-the-next-js-app-router-and-how-to-fix-them)

---

### Pitfall 8: No Rate Limiting or Cost Controls on the Chat API Route

**What goes wrong:** The `/api/chat` endpoint is exposed to the internet (even behind auth). Each request costs real money (Anthropic API tokens). Without rate limiting, a bug in the frontend (infinite retry loop), a browser extension, or even enthusiastic manual use can rack up a large bill.

**Why it happens:** For a personal app, rate limiting feels unnecessary. But the Anthropic API has no built-in per-endpoint spending cap -- only account-level limits.

**Prevention:**
1. Add a simple in-memory rate limiter to the chat API route (e.g., max 20 requests per minute per session).
2. Use Claude 3.5 Haiku instead of Sonnet/Opus for financial queries -- it is 60x cheaper than Opus and fast enough for SQL generation.
3. Set a monthly spending alert on your Anthropic account.
4. Cache schema information in the system prompt to reduce token usage per request.
5. Limit conversation history sent to the API (last 10 messages, not the entire thread).

**Detection:** Monitor your Anthropic dashboard for unexpected spikes. Add logging to the chat API route to track request count and token usage.

**Phase:** Phase 3 (chat implementation).

---

### Pitfall 9: Missing `@supabase/ssr` Package for Next.js Integration

**What goes wrong:** Developer installs only `@supabase/supabase-js` and creates a client with `createClient()`. This works for basic queries but breaks auth cookie handling in the App Router. Auth sessions don't persist across page navigations, middleware can't refresh tokens, and Server Components can't access the user session.

**Why it happens:** The base `supabase-js` package works in browser and Node.js but doesn't handle Next.js cookie-based auth. Many tutorials (especially older ones) only show `supabase-js`. The need for `@supabase/ssr` is not obvious until auth breaks.

**Prevention:**
1. Install both: `npm install @supabase/supabase-js @supabase/ssr`.
2. Create separate client utilities: `utils/supabase/client.ts` (browser) and `utils/supabase/server.ts` (server).
3. Use `createBrowserClient()` from `@supabase/ssr` for client components.
4. Use `createServerClient()` from `@supabase/ssr` for server components and middleware, passing cookie handlers.

**Detection:** Auth works on first login but breaks on page refresh or navigation.

**Phase:** Phase 1 (project setup).

**Source:** [Supabase SSR docs](https://supabase.com/docs/guides/auth/server-side/creating-a-client)

---

### Pitfall 10: Recharts Re-renders on Every Parent State Change

**What goes wrong:** Charts flicker, re-animate, or cause jank whenever a parent component's state changes (e.g., toggling dark/light theme, changing a filter in a sibling component). With multiple charts on the dashboard, this creates a poor visual experience.

**Why it happens:** Recharts components re-render when their parent re-renders, even if chart data hasn't changed. React's default behavior re-renders children unless explicitly memoized.

**Prevention:**
1. Wrap chart components in `React.memo()`.
2. Memoize data with `useMemo()` keyed on the actual data values.
3. Keep `dataKey` prop references stable with `useCallback()`.
4. Disable animations after initial load (`isAnimationActive={false}`) for charts that re-render on filter changes.
5. Isolate theme state from chart components (use CSS variables for theming, not prop-based re-renders).

**Detection:** Toggle dark/light theme and watch if all charts re-animate. If they do, memoization is missing.

**Phase:** Phase 2 (dashboard polish).

**Source:** [Recharts Performance Guide](https://recharts.github.io/en-US/guide/performance/)

---

## Minor Pitfalls

Issues that cause small annoyances or technical debt.

---

### Pitfall 11: Hardcoding Plaid Category Strings for Grouping

**What goes wrong:** Dashboard code groups transactions by `category_primary` using hardcoded strings like `"FOOD_AND_DRINK"`, `"ENTERTAINMENT"`. Plaid updates or adds categories periodically. Hardcoded logic misses new categories or breaks on renamed ones.

**Prevention:**
1. Derive categories dynamically from the data: `SELECT DISTINCT category_primary FROM transactions`.
2. Create a display name mapping (`FOOD_AND_DRINK` -> "Food & Drink") but default to formatting the raw string if unmapped.
3. Use a "catch-all" / "Other" bucket for unmapped categories.

**Phase:** Phase 2 (dashboard charts).

---

### Pitfall 12: Not Handling Null Merchant Names

**What goes wrong:** Many transactions (especially transfers, ACH payments, bank fees) have `merchant_name = null`. The transaction list shows blank rows. Category charts have a mysterious unlabeled segment. Recurring detection fails for these transactions.

**Prevention:**
1. Fall back to `name` (raw bank description) when `merchant_name` is null: `COALESCE(merchant_name, name, 'Unknown')`.
2. Apply this fallback consistently across all queries and display components.

**Phase:** Phase 2 (transactions page).

---

### Pitfall 13: Forgetting Vercel Environment Variables for Production

**What goes wrong:** The app works locally with `.env.local` but breaks on Vercel deployment because environment variables weren't added to the Vercel project settings. The Supabase client silently fails or returns empty data, and the error isn't obvious.

**Prevention:**
1. Add ALL required env vars to Vercel project settings before first deployment: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`.
2. Add startup validation in the app (check for missing vars and throw descriptive errors).
3. Use Vercel's "Preview" environment for testing before promoting to production.

**Phase:** Phase 4 (deployment).

---

### Pitfall 14: Chat System Prompt Sending Full Schema Every Message

**What goes wrong:** Each chat message includes the full database schema in the system prompt plus the entire conversation history. Token usage grows quadratically with conversation length. A 10-message conversation about spending could cost 10x what it should.

**Prevention:**
1. Include schema in the system prompt once (it does not change between messages).
2. Use Anthropic's prompt caching (`cache_control` parameter) to cache the system prompt -- reduces cost by up to 90% on subsequent messages.
3. Limit conversation history to the last 10 messages.
4. Summarize older messages if context is needed.

**Phase:** Phase 3 (chat implementation).

**Source:** [Anthropic Token-Saving Updates](https://www.anthropic.com/news/token-saving-updates)

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Project scaffolding & auth | Service role key leak (#1), Missing @supabase/ssr (#9), Client/server boundary (#7) | Set up Supabase client utilities correctly from day 1. Two files: client.ts and server.ts. Never expose service key. |
| Dashboard & transactions | Amount sign confusion (#4), Pending double-counting (#5), Raw data over-fetching (#6), Null merchants (#12) | Establish amount display convention before writing any chart code. Always filter pending for summaries. Aggregate in SQL. |
| Chat interface | Vercel timeout (#3), No rate limiting (#8), Schema token bloat (#14) | Use Edge runtime + streaming from the start. Add rate limiting. Use prompt caching. Pick Haiku for cost efficiency. |
| Deployment | Missing env vars (#13), Auth cookie handling | Checklist of all required env vars. Test auth flow on Vercel preview before launch. |

## Sources

- [Supabase API Keys](https://supabase.com/docs/guides/api/api-keys)
- [Supabase Securing Your API](https://supabase.com/docs/guides/api/securing-your-api)
- [Supabase Next.js SSR Auth](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase SSR Client Setup](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Vercel Functions Limitations](https://vercel.com/docs/functions/limitations)
- [Vercel Common Next.js App Router Mistakes](https://vercel.com/blog/common-mistakes-with-the-next-js-app-router-and-how-to-fix-them)
- [Plaid Transactions API](https://plaid.com/docs/api/products/transactions/)
- [Plaid Transaction States](https://plaid.com/docs/transactions/transactions-data/)
- [Anthropic Rate Limits](https://docs.anthropic.com/en/api/rate-limits)
- [Anthropic Token-Saving Updates](https://www.anthropic.com/news/token-saving-updates)
- [Recharts Performance Guide](https://recharts.github.io/en-US/guide/performance/)
