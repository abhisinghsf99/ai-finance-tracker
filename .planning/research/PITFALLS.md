# Pitfalls Research

**Domain:** Personal finance dashboard (Next.js App Router + Supabase + Recharts + Anthropic MCP chat)
**Researched:** 2026-03-10
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Recharts SSR Hydration Crash

**What goes wrong:**
Recharts uses D3 internally, which requires DOM access. Importing Recharts components in a Server Component (or even a `"use client"` component that gets server-rendered) causes hydration mismatches or outright crashes. The error manifests as `Text content does not match server-rendered HTML` or blank charts on first load.

**Why it happens:**
Next.js App Router server-renders `"use client"` components by default. Recharts measures container dimensions via `ResizeObserver` on mount, producing different output on server (zero dimensions) vs. client (actual dimensions). The `ResponsiveContainer` component fires `onResize` with width/height of 0 during SSR, triggering console warnings and sometimes rendering nothing.

**How to avoid:**
Use `next/dynamic` with `{ ssr: false }` for every Recharts chart component. Create a thin client wrapper:

```typescript
// components/charts/spending-chart.tsx
"use client";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis } from "recharts";
export function SpendingChart({ data }: Props) { /* ... */ }

// Where you use it:
import dynamic from "next/dynamic";
const SpendingChart = dynamic(
  () => import("@/components/charts/spending-chart").then(m => m.SpendingChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
```

Never import Recharts at the top level of a page or layout component. Always provide a loading skeleton to prevent layout shift.

**Warning signs:**
- Console warnings about `width(0) and height(0) of chart should be greater than 0`
- Charts render blank on first page load but appear after navigation
- Hydration error in dev console mentioning text content mismatch

**Phase to address:** Phase where charts are first implemented (dashboard cards/charts phase). Set the `dynamic` + `ssr: false` pattern in the very first chart component so all subsequent charts copy it.

---

### Pitfall 2: ResponsiveContainer Parent Height Collapse

**What goes wrong:**
`ResponsiveContainer` with `width="100%" height="100%"` renders a chart with zero height because the parent `<div>` has no explicit height. The chart is invisible. Alternatively, if a parent has `margin`, the chart height grows infinitely in a resize loop.

**Why it happens:**
`ResponsiveContainer` uses `ResizeObserver` on its parent. A `height="100%"` only works if the parent has a computed height. In a flex/grid layout with no explicit height, computed height is 0. This is the single most common Recharts issue filed on GitHub (issues #1545, #3688, #5388).

**How to avoid:**
Always give `ResponsiveContainer` an explicit pixel height or use `aspect` ratio:

```typescript
// GOOD: explicit height
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={data}>...</BarChart>
</ResponsiveContainer>

// GOOD: aspect ratio (width auto, height calculated)
<ResponsiveContainer width="100%" aspect={16 / 9}>
  <PieChart>...</PieChart>
</ResponsiveContainer>

// BAD: height="100%" with no parent height constraint
<div>
  <ResponsiveContainer width="100%" height="100%">
    ...
  </ResponsiveContainer>
</div>
```

Never use `margin` on the direct parent of `ResponsiveContainer` -- use `padding` instead, or wrap in an extra div.

**Warning signs:**
- Chart area renders but is invisible (0px tall)
- Chart height keeps growing on window resize
- Console warning about chart dimensions being 0 or negative

**Phase to address:** Same chart implementation phase. Establish the container pattern once in the first chart.

---

### Pitfall 3: Supabase Service Role Key Exposed in Browser

**What goes wrong:**
The `service_role` key ends up in client-side JavaScript. Anyone who opens DevTools can see it, and since `service_role` bypasses all RLS policies, they have full read/write access to every table -- including `plaid_access_token` in the `institutions` table.

**Why it happens:**
The current RLS policies only allow `service_role` access (anon is blocked on all tables). A developer's natural instinct is to use the service role key in the Supabase client to make queries work. If that client is instantiated in a `"use client"` component or imported into one, the key ships to the browser. Environment variables prefixed with `NEXT_PUBLIC_` are also bundled client-side.

**How to avoid:**
Two options (pick one):

1. **Server-side only reads (recommended for this project):** All Supabase queries go through Next.js API route handlers or Server Components using `service_role` key stored in server-only env vars (no `NEXT_PUBLIC_` prefix). The dashboard fetches data via internal API routes, never directly from Supabase in the browser.

2. **Add anon SELECT policies:** Add RLS policies granting `anon` role SELECT access on `accounts`, `transactions`, and `institutions` (excluding sensitive columns like `plaid_access_token`). Then use `SUPABASE_ANON_KEY` in the browser client. This is simpler but requires careful column-level security.

For this project, option 1 is safer because the `institutions` table contains `plaid_access_token`. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only and never prefix it with `NEXT_PUBLIC_`.

**Warning signs:**
- `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
- Supabase client instantiated in a `"use client"` file with service role key
- `createClient` called with `service_role` key anywhere except `/api/` routes or Server Components

**Phase to address:** The very first phase that connects to Supabase (data fetching). Establish the server-side-only data access pattern before any dashboard component is built.

---

### Pitfall 4: Plaid Amount Sign Convention Misinterpretation

**What goes wrong:**
Spending totals, category charts, and trend lines show wrong numbers or negative values. "Total spending this month" shows a negative number, or income transactions inflate the spending total.

**Why it happens:**
Plaid's convention is: **positive = money leaving the account (spending), negative = money entering (income/refunds)**. This is counterintuitive -- most developers expect positive = income. The database already stores Plaid's convention (confirmed in PROJECT.md: "positive = spending/debits, negative = income/refunds"). But when building charts and summary cards, it is easy to:
- Filter for `amount > 0` thinking that captures income
- Sum all amounts without filtering out refunds/income
- Show raw positive amounts as "income" in UI labels
- Confuse credit card vs. checking account perspectives

**How to avoid:**
Create a single utility module that normalizes Plaid amounts for display:

```typescript
// lib/plaid-amounts.ts
export const isSpending = (amount: number) => amount > 0;
export const isIncome = (amount: number) => amount < 0;
export const displayAmount = (amount: number) => Math.abs(amount);
export const totalSpending = (txns: Transaction[]) =>
  txns.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
```

Document the convention in a code comment at the top of this file. Every component that touches amounts must import from this module rather than doing its own sign logic.

**Warning signs:**
- Summary card shows negative spending
- Category totals don't match sum of visible transactions
- "Income" and "spending" labels are swapped
- Month-over-month trend goes the wrong direction

**Phase to address:** Data layer / utility phase (before any dashboard cards are built). The utility module must exist before any component renders amounts.

---

### Pitfall 5: Vercel Serverless Timeout on Chat Streaming

**What goes wrong:**
The chat feature works locally but times out in production on Vercel. Long Claude responses (especially those using MCP tool calls that query the database first) get cut off mid-stream. Users see partial responses or HTTP 504 errors.

**Why it happens:**
Vercel Hobby plan has a **10-second streaming timeout**. A chat request that calls the MCP server (which executes a SQL query against Supabase, then streams Claude's analysis of the results) can easily exceed 10 seconds. The MCP tool call itself takes 2-5 seconds, leaving only 5-8 seconds for the LLM response. Pro plan extends this to 60 seconds.

Additionally, the Anthropic SDK's streaming uses SSE (Server-Sent Events). If the route handler doesn't properly forward the stream (e.g., awaits the full response before sending), the connection dies.

**How to avoid:**
- Use proper streaming in the API route handler -- return a `ReadableStream` response, don't buffer:

```typescript
// app/api/chat/route.ts
export async function POST(req: Request) {
  const stream = await anthropic.messages.stream({ ... });
  return new Response(stream.toReadableStream(), {
    headers: { "Content-Type": "text/event-stream" },
  });
}
```

- Set `maxDuration` in route config for Vercel Pro:
```typescript
export const maxDuration = 60; // seconds (Pro plan)
```

- For Hobby plan: consider whether the MCP tool call latency is acceptable. If not, pre-fetch data server-side and pass it as context rather than letting Claude call MCP tools in real-time.
- Add a client-side timeout indicator so users know the response is still streaming.

**Warning signs:**
- Chat works locally but returns 504 in production
- Responses cut off mid-sentence
- First token takes > 5 seconds to appear
- MCP tool calls succeed but response generation times out

**Phase to address:** Chat implementation phase. Test streaming on Vercel early -- don't wait until the chat UI is polished.

---

### Pitfall 6: Next.js App Router "use client" Boundary Creep

**What goes wrong:**
Too many components get marked `"use client"`, causing the entire page to be client-rendered. The initial JavaScript bundle balloons, first contentful paint slows, and SEO (less relevant here) suffers. More importantly, server-side data fetching becomes impossible in those components, forcing unnecessary API routes or `useEffect` fetch patterns.

**Why it happens:**
A single `useState` or `onClick` handler forces `"use client"`. Since dashboard sections need interactivity (collapsible panels, search filters, chart tooltips), developers mark entire section components as client components. This pulls all child components into the client bundle too, including data-fetching logic that should stay on the server.

**How to avoid:**
Follow the "server component with client islands" pattern:
- Page-level components (`page.tsx`) stay as Server Components and fetch data
- Pass data down as props to small, focused `"use client"` components
- Only the interactive leaf nodes (chart wrapper, collapsible trigger, search input) need `"use client"`

```
page.tsx (Server) -- fetches data
  -> SummaryCards (Server) -- renders static cards
  -> SpendingChart (Client, dynamic import) -- interactive chart
  -> TransactionPanel (Server) -- renders structure
    -> TransactionSearch (Client) -- search input with state
    -> TransactionList (Server) -- renders rows
```

**Warning signs:**
- `page.tsx` files have `"use client"` at the top
- `useEffect` used to fetch data that could be fetched server-side
- Large initial JS bundle (check with `next build` analyzer)

**Phase to address:** First dashboard section phase. Establish the server/client boundary pattern with the first section, then enforce it for all subsequent sections.

---

### Pitfall 7: Dark Theme Color Inconsistency Across Components

**What goes wrong:**
Some components appear with light backgrounds, wrong text contrast, or jarring color transitions. Recharts charts use their own default colors that clash with the dark theme. Custom components outside shadcn's system use hardcoded colors that don't respect CSS variables.

**Why it happens:**
shadcn/ui uses CSS variables (`--background`, `--foreground`, `--card`, etc.) defined in `:root` and `.dark` selectors. Recharts has its own default styling (white backgrounds, black text, built-in color palette). Custom Tailwind classes like `bg-white`, `text-black`, or `border-gray-200` bypass the CSS variable system entirely. Since FinTrack is dark-only, it is easy to miss these because there is no light/dark toggle to reveal inconsistencies -- but they still appear as "slightly wrong" shades.

**How to avoid:**
- Define a Recharts theme config that pulls from CSS variables:
```typescript
const CHART_THEME = {
  backgroundColor: "transparent",
  textColor: "hsl(var(--muted-foreground))",
  gridColor: "hsl(var(--border))",
  tooltipBg: "hsl(var(--popover))",
  tooltipText: "hsl(var(--popover-foreground))",
};
```
- Never use raw Tailwind colors (`bg-white`, `text-gray-900`) -- always use semantic tokens (`bg-background`, `text-foreground`, `bg-card`)
- Define the category color palette (10+ colors for spending categories) as CSS variables so they are centralized
- Set Recharts `<Tooltip>` and `<Legend>` custom content components that use shadcn styling

**Warning signs:**
- White flashes or light-colored elements on the dark page
- Chart tooltips with white backgrounds and black text
- Inconsistent border colors between shadcn cards and custom components
- Chart axis labels unreadable against dark background

**Phase to address:** Theme/design system setup phase (before any visual components). Define the full dark palette and Recharts theme config upfront.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoding Plaid amount logic in each component | Faster to build one component | Sign bugs multiply across every chart/card, inconsistent display | Never -- create the utility module first |
| Using `useEffect` for all data fetching | Familiar pattern, works everywhere | Waterfalls, loading spinners everywhere, no server-side rendering benefit | Only for real-time polling (e.g., pending transactions) |
| Inline Supabase queries in components | Quick prototyping | Query logic scattered, no caching layer, hard to optimize | MVP only, refactor before adding more sections |
| Skipping loading/error states for charts | Ship the happy path faster | Blank areas when data loads slowly, unhandled Supabase errors crash the page | Never -- skeleton + error boundary from day one |
| Single massive `page.tsx` for all dashboard sections | Everything in one file is simple | Unmaintainable, can't optimize individual sections, testing impossible | Never -- extract sections into components immediately |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase RLS + anon key | Creating a browser Supabase client with `service_role` key because anon is blocked by RLS | Either add SELECT policies for anon role, or use server-side-only queries via API routes |
| Recharts + Next.js SSR | Importing Recharts directly in page components | Always use `next/dynamic` with `{ ssr: false }` and provide loading skeletons |
| Anthropic SDK streaming | Awaiting full response then sending to client | Return `stream.toReadableStream()` directly from the route handler |
| Anthropic MCP client | Initializing MCP client per request (expensive) | Initialize once at module scope or use a singleton; MCP client connection is stateful |
| Supabase realtime | Subscribing to table changes in every component | Not needed for this project -- data updates via webhook, not user actions. Simple ISR or polling is sufficient |
| Plaid amounts in SQL aggregations | `SUM(amount)` without filtering -- mixes spending and income | `SUM(amount) FILTER (WHERE amount > 0)` for spending, `SUM(ABS(amount)) FILTER (WHERE amount < 0)` for income |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Fetching all transactions client-side | Slow initial load, browser memory spike | Paginate server-side, fetch only what's visible. Use cursor-based pagination on `transactions.date` | > 1,000 transactions (a few months of data) |
| Re-rendering all charts on any state change | Laggy scrolling, chart flickering | Memoize chart components with `React.memo`, isolate state per section | > 3 charts on page simultaneously |
| No Supabase query result caching | Every scroll or re-render re-fetches the same data | Use Next.js `fetch` cache or React `cache()` in Server Components. Set `revalidate` interval | Any amount of traffic (wastes Supabase quota) |
| Loading all 6 months of chart data on page load | 3+ second initial load | Lazy-load chart data per section as user scrolls into view, or use `Suspense` boundaries per section | > 500 transactions per month |
| Unoptimized Recharts re-renders | Charts flicker when parent re-renders | Pass stable `data` references (useMemo), avoid spreading new objects as chart props | Always -- Recharts diffs by reference |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` | Full database access from any browser -- attacker can read Plaid access tokens, modify/delete all financial data | Never prefix service role key with `NEXT_PUBLIC_`. Keep it in server-only env vars. Verify with `next build` that the key doesn't appear in client bundles |
| Anthropic API key in client bundle | Anyone can make API calls billed to your account | Always call Anthropic from API route handlers, never from `"use client"` components. Store as `ANTHROPIC_API_KEY` (no `NEXT_PUBLIC_` prefix) |
| Password stored in `NEXT_PUBLIC_` env var | Login password visible in page source | Store as `APP_PASSWORD` (server-only). Login form POSTs to API route that validates and sets httpOnly cookie |
| No rate limiting on chat endpoint | Bot or curious user can run up Anthropic API bill | Add basic rate limiting in the chat API route (e.g., in-memory counter, 20 requests per minute) |
| MCP server at claudefinancetracker.xyz/mcp is authless | Anyone who discovers the URL can query your financial database | Add authentication to the MCP server (API key header), or restrict to server-side calls only from known IPs |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No loading states for financial data | User sees blank cards, thinks app is broken | Skeleton loaders matching exact card dimensions. Never show $0.00 as a loading state -- it looks like real data |
| Showing raw Plaid category names | "FOOD_AND_DRINK_RESTAURANTS" is ugly and confusing | Map to human-friendly labels: "Restaurants & Dining". Create a category display map |
| Charts without context | A bar chart showing $2,400 in March means nothing without comparison | Always show month-over-month change (% and absolute). Add average line to bar charts |
| Transaction search with no results feedback | Empty white space when filter returns nothing | "No transactions match your search" with suggestion to clear filters |
| Collapsible panels all closed on load | User lands on page and sees only summary cards with no detail | Default first section (recent transactions) to expanded. Persist expand/collapse state in localStorage |
| Mobile charts too small to read | Donut chart labels overlap, bar chart x-axis unreadable | On mobile: simplify charts (fewer data points, abbreviated labels), or stack chart + legend vertically |

## "Looks Done But Isn't" Checklist

- [ ] **Charts:** Renders with sample data but crashes with empty data (no transactions in a month) -- verify charts handle empty arrays gracefully
- [ ] **Summary cards:** Shows current values but "% change from last month" divides by zero when last month had no transactions
- [ ] **Login:** Password check works but session cookie has no expiration -- verify 30-day TTL and httpOnly flag
- [ ] **Chat streaming:** First message works but conversation history is not sent with subsequent messages -- verify multi-turn context
- [ ] **Mobile nav:** Bottom tab bar looks correct but overlaps the last section content -- verify `padding-bottom` on main content
- [ ] **Credit utilization bars:** Render but don't handle accounts with null `balance_limit` (checking/savings accounts)
- [ ] **Recurring detection:** Shows recurring charges but doesn't handle merchants with slightly different names ("Netflix" vs "NETFLIX.COM")
- [ ] **Amount formatting:** Displays $1234.5 instead of $1,234.50 -- verify `Intl.NumberFormat` with exactly 2 decimal places
- [ ] **Date handling:** Works in dev but shows wrong dates in production due to timezone offset -- verify UTC-consistent date handling with Plaid's `date` field (which is a plain date, not a timestamp)
- [ ] **Category donut chart:** Shows all categories including a massive "Other" wedge that dwarfs everything else -- verify top-N with grouped remainder

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Service role key leaked in client bundle | HIGH | Rotate key immediately in Supabase dashboard, redeploy with server-only access pattern, audit for unauthorized access in Supabase logs |
| Plaid amount signs wrong throughout app | MEDIUM | Create utility module, find/replace all raw `amount` references, add unit tests for sign convention |
| Recharts SSR crashes in production | LOW | Wrap each chart import with `dynamic({ ssr: false })` -- can be done incrementally per component |
| Chat timeouts on Vercel Hobby | LOW | Add `maxDuration` config, upgrade to Pro if needed, or pre-fetch data instead of MCP tool calls |
| Dark theme inconsistencies | LOW | Audit all components for raw color classes, replace with CSS variable tokens -- tedious but mechanical |
| "use client" boundary creep | MEDIUM | Refactoring nested components from client to server requires restructuring data flow -- harder the more components are affected |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Recharts SSR hydration crash | Charts implementation | First chart renders without hydration errors in `next dev` and `next build` |
| ResponsiveContainer height collapse | Charts implementation | All charts visible on first load, no zero-height containers |
| Service role key exposure | Data layer / Supabase connection | `grep -r "NEXT_PUBLIC.*SERVICE_ROLE" .env*` returns nothing. Client bundle analysis shows no key |
| Plaid amount sign convention | Data utilities (before any UI) | Unit tests pass for `isSpending`, `isIncome`, `totalSpending` with positive and negative amounts |
| Vercel streaming timeout | Chat implementation | Chat response streams successfully on Vercel deployment, not just localhost |
| "use client" boundary creep | First dashboard section | `page.tsx` files are Server Components. `"use client"` only on leaf interactive components |
| Dark theme inconsistency | Design system / theme setup | Visual audit of every component in browser -- no white flashes, readable text, consistent borders |
| Mobile responsiveness | Each section implementation | Test every section at 375px width (iPhone SE) during implementation, not after |
| Empty data edge cases | Each section implementation | Verify each chart/card/panel with empty arrays and zero values before marking section complete |

## Sources

- [Next.js Hydration Error Docs](https://nextjs.org/docs/messages/react-hydration-error) -- official hydration error reference
- [Recharts ResponsiveContainer #1545](https://github.com/recharts/recharts/issues/1545) -- height not filling
- [Recharts ResponsiveContainer #5388](https://github.com/recharts/recharts/issues/5388) -- infinite height with parent margin
- [Recharts SSR #2918](https://github.com/recharts/recharts/issues/2918) -- Next.js SSR errors
- [Supabase API Keys Docs](https://supabase.com/docs/guides/api/api-keys) -- anon vs service_role security
- [Supabase RLS Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) -- policy best practices
- [Plaid Transactions API](https://plaid.com/docs/api/products/transactions/) -- amount sign convention
- [Vercel Common Mistakes with App Router](https://vercel.com/blog/common-mistakes-with-the-next-js-app-router-and-how-to-fix-them) -- official Vercel guidance
- [Vercel Serverless Timeout KB](https://vercel.com/kb/guide/what-can-i-do-about-vercel-serverless-functions-timing-out) -- timeout limits by plan
- [Vercel SSE Discussion](https://github.com/vercel/next.js/discussions/48427) -- SSE in Next.js API routes
- [shadcn/ui Theming Docs](https://ui.shadcn.com/docs/theming) -- CSS variable system
- [Anthropic Streaming Docs](https://docs.anthropic.com/en/api/messages-streaming) -- SSE streaming reference

---
*Pitfalls research for: FinTrack personal finance dashboard*
*Researched: 2026-03-10*
