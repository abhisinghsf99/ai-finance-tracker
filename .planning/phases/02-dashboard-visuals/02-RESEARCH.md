# Phase 2: Dashboard Visuals - Research

**Researched:** 2026-03-11
**Domain:** Data visualization, fintech dashboard UI, Recharts with React 19 / Next.js 15
**Confidence:** HIGH

## Summary

This phase replaces the placeholder sections in `page.tsx` with real financial data displays: summary cards, account cards, and two chart types (bar + donut). The primary technical decision -- using Recharts -- was established in Phase 1 research and confirmed in CONTEXT.md. The shadcn/ui chart component (`ChartContainer`, `ChartTooltip`, `ChartLegend`) provides a thin wrapper around Recharts that integrates with the existing design system and CSS variables, which is the recommended approach.

The data layer is already in place: typed query functions for accounts, transactions, and monthly spending exist in `lib/queries/`. New server-side query functions are needed for trailing 6-month spending and category breakdowns. All chart components must be client components (Recharts needs browser APIs), loaded via `next/dynamic` with `ssr: false` to avoid hydration issues.

**Primary recommendation:** Use `shadcn add chart` to get the ChartContainer/ChartTooltip primitives, then build BarChart and PieChart compositions as `"use client"` components loaded with `next/dynamic`. Keep all data fetching in server components and pass data as props.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Use **Stitch MCP (Nano Banana 2)** to generate screen designs following best practices
- Use **ui-ux-pro-max** skill for implementation guidance
- Dark theme with teal/cyan accent (established in Phase 1) -- all new components must match
- Copilot-style aesthetic: warm, approachable fintech with rounded cards, soft gradients
- Summary cards: current month spending, last month with % change, transaction count
- Net position card: total cash minus total credit minus total loans
- Account cards: name, last 4 digits (mask), balance, account type
- Credit utilization bars: green (<30%), amber (30-70%), red (>70%)
- Monthly spending trend: bar chart, trailing 6 months, hover for exact amounts
- Category donut: current month spending by category_primary with legend
- Muted harmonious palette with 10+ distinct category colors
- Charts use Recharts with dynamic import (no SSR) per Phase 1 research

### Claude's Discretion
- Summary card layout arrangement (grid sizing, responsive breakpoints)
- Account card visual design details (icons, borders, spacing)
- Chart sizing and placement (side by side vs stacked)
- Category drill-down interaction pattern
- Loading skeleton designs
- Empty state designs
- Responsive behavior details (mobile vs desktop chart sizing)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DASH-01 | Summary cards: current month spending, last month with % change, transaction count | Existing `getMonthlySpending()` query returns `{total, count}`. Call twice (current + previous month). Use `formatCurrency` + percentage calc. |
| DASH-02 | Account cards: name, last 4, balance, type | Existing `getAccounts()` returns all fields needed. Group by `type` for visual distinction. |
| DASH-03 | Net position card: cash - credit - loans | Compute from `getAccounts()` data: sum `balance_current` by account `type`. Depository = cash, credit = owed, loan = owed. |
| DASH-04 | Credit utilization bars with green/amber/red | `balance_current / balance_limit` for credit accounts. Three color thresholds via Tailwind classes. |
| CHRT-01 | 6-month spending trend bar chart with hover | New query: get monthly spending for trailing 6 months. Recharts `BarChart` + `Tooltip`. |
| CHRT-02 | Category donut chart with legend | New query: group transactions by `category_primary` for current month. Recharts `PieChart` + `Legend`. |
| CHRT-03 | Category drill-down: click shows transactions | Client-side state: selected category triggers filtered transaction list. Sheet/panel pattern. |
| CHRT-04 | Muted palette with 10+ category colors | Define CSS custom properties or static color array. Map to `category_primary` values. |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | 2.15.x (latest 2.x) | Chart rendering (BarChart, PieChart) | Native React 19 peer dep support as of 2.15.0. shadcn/ui wraps it. |
| shadcn/ui chart | latest (via `shadcn add chart`) | ChartContainer, ChartTooltip, ChartLegend | Integrates Recharts with existing design system CSS variables. No abstraction lock-in. |
| next/dynamic | built-in | Lazy load chart components with `ssr: false` | Recharts uses browser APIs; must skip SSR. |
| lucide-react | 0.577.x (installed) | Icons for cards (wallet, credit card, trending) | Already installed in Phase 1. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui sheet | installed | Category drill-down panel | Slide-out panel for CHRT-03 drill-down |
| shadcn/ui skeleton | installed | Loading states | Skeleton placeholders while data loads |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts | Nivo, Victory | Recharts is lighter, more composable, already chosen in Phase 1 |
| shadcn chart wrapper | Raw Recharts | Lose CSS variable integration, custom tooltip styling for free |

**Installation:**
```bash
cd fintrack-dashboard
pnpm dlx shadcn@latest add chart
```
This installs `recharts` as a dependency and adds `components/ui/chart.tsx` with ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent.

**Note on react-is:** Recharts 2.15.x lists React 19 as a peer dependency. If npm/pnpm complains about `react-is` version mismatch, add an override in `package.json`:
```json
"overrides": {
  "react-is": "^19.1.0"
}
```
For pnpm, use `pnpm.overrides` instead of `overrides`.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── dashboard/
│   │   ├── summary-cards.tsx       # Server component: fetches + renders 3 summary cards
│   │   ├── account-cards.tsx       # Server component: fetches accounts, renders cards + utilization
│   │   ├── net-position-card.tsx   # Server component: computes and displays net position
│   │   ├── spending-chart.tsx      # Client component ("use client"): BarChart
│   │   ├── category-chart.tsx      # Client component ("use client"): PieChart + drill-down
│   │   └── category-transactions.tsx # Client component: drill-down transaction list
│   ├── layout/                     # (existing)
│   └── ui/                         # (existing + chart.tsx added by shadcn)
├── lib/
│   ├── queries/
│   │   ├── accounts.ts             # (existing)
│   │   ├── transactions.ts         # (existing + new queries)
│   │   ├── institutions.ts         # (existing)
│   │   └── types.ts                # (existing)
│   ├── plaid-amounts.ts            # (existing)
│   └── chart-colors.ts             # NEW: category color palette (10+ colors)
└── app/
    └── (app)/
        └── page.tsx                # Server component: orchestrates all sections
```

### Pattern 1: Server Component Data Fetching + Client Chart Rendering
**What:** Server components fetch data from Supabase, serialize it as props to client chart components loaded via `next/dynamic`.
**When to use:** All chart components (Recharts requires browser APIs).
**Example:**
```typescript
// app/(app)/page.tsx (server component)
import dynamic from "next/dynamic"
import { SummaryCards } from "@/components/dashboard/summary-cards"
import { AccountCards } from "@/components/dashboard/account-cards"
import { Skeleton } from "@/components/ui/skeleton"

const SpendingChart = dynamic(
  () => import("@/components/dashboard/spending-chart"),
  { ssr: false, loading: () => <Skeleton className="h-[300px] w-full" /> }
)

const CategoryChart = dynamic(
  () => import("@/components/dashboard/category-chart"),
  { ssr: false, loading: () => <Skeleton className="h-[300px] w-full" /> }
)
```

### Pattern 2: Credit Utilization Color Coding
**What:** Compute utilization ratio and map to color.
**When to use:** DASH-04 credit utilization bars.
**Example:**
```typescript
function getUtilizationColor(current: number, limit: number): string {
  if (!limit || limit === 0) return "bg-muted"
  const ratio = current / limit
  if (ratio < 0.3) return "bg-green-500"
  if (ratio < 0.7) return "bg-amber-500"
  return "bg-red-500"
}
```

### Pattern 3: Category Color Palette
**What:** Static mapping of 10+ muted colors for chart categories.
**When to use:** CHRT-02 and CHRT-04 -- donut chart segments and legend.
**Example:**
```typescript
// lib/chart-colors.ts
export const CATEGORY_COLORS: Record<string, string> = {
  FOOD_AND_DRINK: "hsl(175 50% 45%)",       // teal
  TRANSPORTATION: "hsl(210 50% 50%)",        // blue
  ENTERTAINMENT: "hsl(280 40% 55%)",         // purple
  SHOPPING: "hsl(340 45% 55%)",              // rose
  GENERAL_MERCHANDISE: "hsl(25 60% 55%)",    // orange
  RENT_AND_UTILITIES: "hsl(45 60% 50%)",     // amber
  PERSONAL_CARE: "hsl(150 40% 45%)",         // green
  TRAVEL: "hsl(195 55% 50%)",               // sky
  GENERAL_SERVICES: "hsl(230 40% 55%)",      // indigo
  LOAN_PAYMENTS: "hsl(0 45% 55%)",           // red
  TRANSFER_OUT: "hsl(260 35% 50%)",          // violet
  MEDICAL: "hsl(160 45% 40%)",              // emerald
  OTHER: "hsl(220 15% 55%)",                // gray
}

// Fallback for unknown categories
export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.OTHER
}
```

### Pattern 4: shadcn/ui ChartConfig for Recharts Integration
**What:** Define a ChartConfig object to map data keys to labels and CSS variable colors.
**When to use:** Every chart component.
**Example:**
```typescript
"use client"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"

const chartConfig = {
  spending: {
    label: "Spending",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

export default function SpendingChart({ data }: { data: MonthlyData[] }) {
  return (
    <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
      <BarChart data={data}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="total" fill="var(--color-spending)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}
```

### Anti-Patterns to Avoid
- **Fetching data in client components:** All Supabase queries use `service_role` key and must run server-side. Never import `createServerSupabase` in a `"use client"` component.
- **Importing Recharts in server components:** Recharts uses `window` and other browser APIs. Always wrap in `"use client"` or load via `next/dynamic({ ssr: false })`.
- **Using ResponsiveContainer without fixed height:** Recharts ResponsiveContainer needs a parent with explicit height. Use `min-h-[VALUE]` on ChartContainer (shadcn handles this).
- **Hard-coding colors instead of CSS variables:** Break dark theme. Use `hsl(var(--chart-N))` or the CATEGORY_COLORS palette with HSL values that work on dark backgrounds.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chart tooltips | Custom hover handlers + positioned divs | `ChartTooltip` + `ChartTooltipContent` from shadcn | Handles positioning, animation, theme integration, accessibility |
| Chart legends | Manual legend markup | `ChartLegend` + `ChartLegendContent` from shadcn | Syncs with ChartConfig colors and labels |
| Currency formatting | Template literal `$${amount}` | `formatCurrency()` from `plaid-amounts.ts` | Handles locale, decimal places, negative values |
| Amount sign logic | `amount > 0 ? "spending" : "income"` | `isSpending()` / `isIncome()` from `plaid-amounts.ts` | Plaid convention is counterintuitive; centralized logic prevents bugs |
| Loading skeletons | Custom animated divs | `<Skeleton />` from shadcn/ui | Already installed, matches design system |
| Slide-out panels | Custom positioned div | `<Sheet />` from shadcn/ui | Already installed, handles animation, backdrop, accessibility |

**Key insight:** The existing codebase already has query functions, amount utilities, and UI primitives. The main new code is: (1) new query functions for aggregated data, (2) chart component compositions, (3) dashboard card layouts.

## Common Pitfalls

### Pitfall 1: Plaid Amount Sign Convention
**What goes wrong:** Displaying spending as negative or income as positive.
**Why it happens:** Plaid uses positive = money leaving (spending), negative = money entering (income). This is the opposite of accounting convention.
**How to avoid:** Always use `isSpending()`, `formatCurrency()`, and `totalSpending()` from `plaid-amounts.ts`. Never compare raw `amount` directly.
**Warning signs:** Negative numbers showing in spending totals, or "income" appearing as spending.

### Pitfall 2: Net Position Calculation Confusion
**What goes wrong:** Double-counting or wrong signs in net position.
**Why it happens:** `balance_current` for credit accounts is the amount owed (positive in Plaid), not available credit.
**How to avoid:** Net position = sum of depository `balance_current` - sum of credit `balance_current` - sum of loan `balance_current`. Depository balances are positive (cash you have). Credit/loan balances are positive (money you owe).
**Warning signs:** Net position showing as unexpectedly large positive or negative.

### Pitfall 3: Recharts SSR Crash
**What goes wrong:** `ReferenceError: window is not defined` during server rendering.
**Why it happens:** Recharts components access browser APIs.
**How to avoid:** Use `next/dynamic` with `{ ssr: false }` for every component that imports from `recharts`.
**Warning signs:** Build fails or server-side error on page load.

### Pitfall 4: Empty Data States
**What goes wrong:** Charts render empty or crash on zero-length arrays.
**Why it happens:** No transactions for current month, no accounts linked.
**How to avoid:** Check data length before rendering charts. Show meaningful empty states ("No spending data for this month").
**Warning signs:** Blank chart areas with no user feedback.

### Pitfall 5: Category Drill-Down Losing Context
**What goes wrong:** Category click fires but transactions don't filter correctly.
**Why it happens:** `category_primary` values are uppercase enum strings (e.g., `FOOD_AND_DRINK`), need exact match when filtering.
**How to avoid:** Pass the exact `category_primary` string from chart data to filter function.
**Warning signs:** All transactions showing regardless of selected category.

### Pitfall 6: Mobile Chart Readability
**What goes wrong:** Charts too small to read on mobile, labels overlap.
**Why it happens:** Fixed chart dimensions or too many X-axis labels.
**How to avoid:** Use `ChartContainer` with responsive min-height. Abbreviate month labels on mobile (e.g., "Jan" not "January"). Consider hiding Y-axis labels on small screens.
**Warning signs:** Overlapping text, tiny touch targets on donut segments.

## Code Examples

### New Query: Trailing 6-Month Spending
```typescript
// lib/queries/transactions.ts (add to existing file)
export async function getTrailingMonthlySpending(
  months: number = 6
): Promise<{ month: string; total: number; count: number }[]> {
  const results: { month: string; total: number; count: number }[] = []
  const now = new Date()

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const { total, count } = await getMonthlySpending(yearMonth)
    results.push({
      month: d.toLocaleDateString("en-US", { month: "short" }),
      total,
      count,
    })
  }

  return results
}
```

### New Query: Category Spending Breakdown
```typescript
// lib/queries/transactions.ts (add to existing file)
export async function getCategorySpending(
  yearMonth: string
): Promise<{ category: string; total: number; count: number }[]> {
  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from("transactions")
    .select("amount, category_primary")
    .like("date", `${yearMonth}%`)

  if (error)
    throw new Error(`Failed to fetch category spending: ${error.message}`)

  const categories = new Map<string, { total: number; count: number }>()

  for (const t of data as { amount: number; category_primary: string | null }[]) {
    if (t.amount <= 0) continue // Only spending
    const cat = t.category_primary ?? "OTHER"
    const existing = categories.get(cat) ?? { total: 0, count: 0 }
    categories.set(cat, {
      total: existing.total + t.amount,
      count: existing.count + 1,
    })
  }

  return Array.from(categories.entries())
    .map(([category, { total, count }]) => ({ category, total, count }))
    .sort((a, b) => b.total - a.total)
}
```

### New Query: Transactions by Category (for drill-down)
```typescript
// lib/queries/transactions.ts (add to existing file)
export async function getTransactionsByCategory(
  yearMonth: string,
  category: string
): Promise<Transaction[]> {
  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .like("date", `${yearMonth}%`)
    .eq("category_primary", category)
    .gt("amount", 0)
    .order("date", { ascending: false })

  if (error)
    throw new Error(`Failed to fetch category transactions: ${error.message}`)
  return data as Transaction[]
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Raw Recharts with manual styling | shadcn/ui chart wrapper (ChartContainer) | 2024 | CSS variable integration, consistent theming |
| `react-is` override needed | Recharts 2.15.x native React 19 support | Late 2024 | May still need override if transitive dep is old |
| Client-side data fetching | Server components fetch, pass props to client charts | Next.js 13+ (2023) | Better performance, no exposed API keys |

**Deprecated/outdated:**
- `ResponsiveContainer` from Recharts: shadcn's `ChartContainer` replaces it with better responsive behavior via `min-h-[VALUE]` class

## Open Questions

1. **react-is override still needed with Recharts 2.15.x?**
   - What we know: Recharts 2.15.0 added React 19 to peerDependencies. Some reports say `react-is` override is still needed.
   - What's unclear: Whether the latest npm release resolves this fully.
   - Recommendation: Try installing without override first. Add override only if install warns or charts fail to render.

2. **Optimal number of Supabase queries per page load**
   - What we know: The dashboard page will make 4-5 parallel Supabase queries (accounts, current month, last month, trailing 6 months, categories).
   - What's unclear: Whether this causes noticeable latency on Vercel Hobby.
   - Recommendation: Use `Promise.all()` for parallel fetching. Consider consolidating if latency is an issue.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x + @testing-library/react 16.x |
| Config file | `fintrack-dashboard/vitest.config.ts` |
| Quick run command | `cd fintrack-dashboard && pnpm test` |
| Full suite command | `cd fintrack-dashboard && pnpm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASH-01 | Summary cards render spending, % change, count | unit | `cd fintrack-dashboard && pnpm vitest run src/__tests__/summary-cards.test.tsx -x` | -- Wave 0 |
| DASH-02 | Account cards render name, mask, balance, type | unit | `cd fintrack-dashboard && pnpm vitest run src/__tests__/account-cards.test.tsx -x` | -- Wave 0 |
| DASH-03 | Net position = cash - credit - loans | unit | `cd fintrack-dashboard && pnpm vitest run src/__tests__/net-position.test.ts -x` | -- Wave 0 |
| DASH-04 | Utilization bars color-coded correctly | unit | `cd fintrack-dashboard && pnpm vitest run src/__tests__/credit-utilization.test.ts -x` | -- Wave 0 |
| CHRT-01 | Spending bar chart renders 6 bars | unit | `cd fintrack-dashboard && pnpm vitest run src/__tests__/spending-chart.test.tsx -x` | -- Wave 0 |
| CHRT-02 | Category donut renders segments + legend | unit | `cd fintrack-dashboard && pnpm vitest run src/__tests__/category-chart.test.tsx -x` | -- Wave 0 |
| CHRT-03 | Category click shows filtered transactions | unit | `cd fintrack-dashboard && pnpm vitest run src/__tests__/category-drilldown.test.tsx -x` | -- Wave 0 |
| CHRT-04 | 10+ distinct colors in palette | unit | `cd fintrack-dashboard && pnpm vitest run src/__tests__/chart-colors.test.ts -x` | -- Wave 0 |

### Sampling Rate
- **Per task commit:** `cd fintrack-dashboard && pnpm test`
- **Per wave merge:** `cd fintrack-dashboard && pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/summary-cards.test.tsx` -- covers DASH-01
- [ ] `src/__tests__/account-cards.test.tsx` -- covers DASH-02
- [ ] `src/__tests__/net-position.test.ts` -- covers DASH-03
- [ ] `src/__tests__/credit-utilization.test.ts` -- covers DASH-04
- [ ] `src/__tests__/spending-chart.test.tsx` -- covers CHRT-01
- [ ] `src/__tests__/category-chart.test.tsx` -- covers CHRT-02, CHRT-03
- [ ] `src/__tests__/chart-colors.test.ts` -- covers CHRT-04

**Note:** Chart component tests will need to mock Recharts components since they rely on browser APIs. Test the data transformation and color logic directly; test chart rendering with shallow rendering or snapshot tests.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `lib/queries/`, `lib/plaid-amounts.ts`, `components/ui/`, `app/(app)/page.tsx`
- `supabase-migration.sql` -- database schema with column types and indexes
- `package.json` -- React 19.1.0, Next.js 15.5.12, shadcn 4.x, Vitest 4.x
- [shadcn/ui Chart docs](https://ui.shadcn.com/docs/components/radix/chart) -- ChartContainer, ChartTooltip API

### Secondary (MEDIUM confidence)
- [Recharts React 19 support issue #4558](https://github.com/recharts/recharts/issues/4558) -- confirmed 2.15.0 adds React 19 peer dep
- [Recharts releases](https://github.com/recharts/recharts/releases) -- version history
- [shadcn/ui React 19 guide](https://ui.shadcn.com/docs/react-19) -- override guidance

### Tertiary (LOW confidence)
- [Recharts v3 migration PR](https://github.com/shadcn-ui/ui/pull/8486) -- v3 coming but not stable yet; stick with v2.15.x

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Recharts 2.15.x + shadcn chart is well-documented and confirmed React 19 compatible
- Architecture: HIGH - Server/client component split follows established Phase 1 patterns
- Pitfalls: HIGH - Based on actual codebase inspection (Plaid amount convention, DB schema)
- Validation: HIGH - Vitest infrastructure exists from Phase 1, test patterns established

**Research date:** 2026-03-11
**Valid until:** 2026-04-11 (stable ecosystem, Recharts v2 is mature)
