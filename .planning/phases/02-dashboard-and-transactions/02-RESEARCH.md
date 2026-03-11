# Phase 2: Dashboard and Transactions - Research

**Researched:** 2026-03-10
**Domain:** Dashboard data visualization, transaction search/filter, Supabase server-side queries, anomaly flagging
**Confidence:** HIGH

## Summary

Phase 2 replaces the placeholder skeleton pages from Phase 1 with live data from Supabase. The dashboard page needs account balance cards, a net position summary, credit utilization bars, a category breakdown donut chart, recent transactions, and automated suspicious transaction flags. The transactions page needs full-text search, multi-dimension filtering (date, category, account, amount), and pagination.

The technical approach is straightforward: all data fetching happens in Next.js Server Components via the existing `createServerSupabase()` utility (service_role key, never exposed to browser). Chart rendering uses shadcn/ui's built-in chart component (which wraps Recharts) -- the chart CSS variables (`--chart-1` through `--chart-5`) are already defined in `globals.css` for both light and dark themes. Transaction filtering uses URL search params for server-side queries, keeping the transactions page a Server Component with small client interactive pieces (search input, filter dropdowns).

The most complex requirement is DASH-06 (automated suspicious transaction flags). This is a pure server-side computation -- compare each transaction's amount against the account's historical spending patterns, flag new merchants above a threshold, and detect duplicate charges. No ML or external service needed; simple statistical rules applied during data fetch.

**Primary recommendation:** Use `npx shadcn@latest add chart` to install the chart component (brings Recharts 2.x), build all data queries as async functions in a `src/lib/queries/` directory, keep dashboard and transactions pages as Server Components that pass processed data to thin client chart/filter wrapper components.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DASH-01 | User can see individual account cards with current balance, type, and institution | Supabase join query: `accounts` with `institutions` via foreign key. Server Component renders Card components. |
| DASH-02 | User can see net position card showing total cash minus total credit minus total loans | Server-side computation from accounts query, grouped by `type` field. Simple arithmetic on `balance_current`. |
| DASH-03 | User can see credit utilization bars for each credit card | Filter accounts where `type='credit'`, compute `balance_current / balance_limit`. Progress bar component from shadcn/ui or custom div with width%. |
| DASH-04 | User can see a circle chart showing spending by category for the last 2 weeks | Supabase query: transactions from last 14 days grouped by `category_primary`, summed. shadcn/ui chart component with Recharts PieChart + innerRadius for donut. |
| DASH-05 | User can see and expand a recent transactions list limited to last 30 days | Supabase query: transactions ordered by date desc, limit 30 days, with account join. Collapsible list using shadcn/ui Collapsible or simple state toggle. |
| DASH-06 | User sees automated flags on suspicious transactions | Server-side rules: (1) amount > 2x account median, (2) merchant_name not in last 90 days of transactions, (3) duplicate amount+merchant within 48 hours. Computed during data fetch, rendered as badges. |
| TXNS-01 | User can browse all transactions with search by merchant name or description | Supabase `.or()` with `.ilike()` on `merchant_name` and `name` columns. URL search params for server-side filtering. |
| TXNS-02 | User can filter transactions by date range, category, account, and amount range | Supabase `.gte()/.lte()` for date and amount, `.eq()` for category and account_id. Filter UI as client components that update URL search params. |
</phase_requirements>

## Standard Stack

### Core (already installed from Phase 1)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.5.12 | App framework | Already installed. Server Components for data fetching. |
| @supabase/supabase-js | 2.99.x | Database client | Already installed. `createServerSupabase()` utility exists. |
| shadcn/ui | CLI v4 | UI components | Already installed. Card, Skeleton, Button, Input available. |

### New for Phase 2

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | 2.x (via shadcn chart) | Chart rendering | Installed by `npx shadcn@latest add chart`. shadcn/ui wraps Recharts with `ChartContainer`, `ChartTooltip`, `ChartConfig` for themed charts. |

### shadcn/ui Components to Add

| Component | Command | Used For |
|-----------|---------|----------|
| chart | `npx shadcn@latest add chart` | Donut chart for category breakdown (DASH-04). Installs Recharts as dependency. |
| badge | `npx shadcn@latest add badge` | Suspicious transaction flags (DASH-06), category labels |
| progress | `npx shadcn@latest add progress` | Credit utilization bars (DASH-03) |
| collapsible | `npx shadcn@latest add collapsible` | Expandable recent transactions list (DASH-05) |
| popover | `npx shadcn@latest add popover` | Filter dropdown panels (TXNS-02) |
| calendar | `npx shadcn@latest add calendar` | Date range picker for transaction filters (TXNS-02) |
| select | `npx shadcn@latest add select` | Category and account filter dropdowns (TXNS-02) |
| slider | `npx shadcn@latest add slider` | Amount range filter (TXNS-02) |

### Not Needed in Phase 2

| Library | Why Not |
|---------|---------|
| TanStack Table | Overkill for a personal app with small dataset. Simple server-side queries + HTML table structure is sufficient. |
| React Query | Data is fetched server-side in Server Components. No client-side caching needed. |
| date-fns | Minimal date formatting needed. Native `Intl.DateTimeFormat` and `Date` methods suffice. If the calendar component from shadcn requires it, it will be installed as a dependency automatically. |

**Installation:**
```bash
cd fintrack-dashboard

# Add shadcn components for Phase 2
npx shadcn@latest add chart badge progress collapsible popover calendar select slider
```

Note: `npx shadcn@latest add chart` installs `recharts` as a dependency automatically. Recharts 2.x is the version that ships with shadcn/ui's current chart component. If React 19 compatibility issues arise with `react-is`, add an override in `package.json`:
```json
{
  "overrides": {
    "react-is": "^19.0.0"
  }
}
```

## Architecture Patterns

### Recommended Project Structure (Phase 2 Additions)

```
src/
├── app/(app)/
│   ├── page.tsx                    # Dashboard (Server Component) - replaces placeholder
│   └── transactions/
│       └── page.tsx                # Transactions (Server Component) - replaces placeholder
├── components/
│   ├── dashboard/
│   │   ├── account-card.tsx        # Single account card (Server Component)
│   │   ├── net-position-card.tsx   # Net position summary (Server Component)
│   │   ├── credit-utilization.tsx  # Credit utilization bars (Server Component)
│   │   ├── category-chart.tsx      # Donut chart wrapper ("use client")
│   │   ├── recent-transactions.tsx # Recent transactions list (Server Component)
│   │   └── suspicious-badge.tsx    # Flag badge for suspicious transactions
│   ├── transactions/
│   │   ├── search-bar.tsx          # Search input ("use client")
│   │   ├── filter-panel.tsx        # Filter controls ("use client")
│   │   ├── transaction-row.tsx     # Single transaction row
│   │   └── transaction-list.tsx    # Transaction table/list (Server Component)
│   └── ui/                         # shadcn components (auto-generated)
├── lib/
│   ├── queries/
│   │   ├── accounts.ts             # Account + institution queries
│   │   ├── transactions.ts         # Transaction queries with filters
│   │   └── categories.ts           # Category aggregation queries
│   ├── flags.ts                    # Suspicious transaction detection logic
│   ├── formatters.ts               # Currency, date, percentage formatters
│   └── supabase/
│       └── server.ts               # Existing createServerSupabase()
└── types/
    └── database.ts                 # TypeScript types for Supabase tables
```

### Pattern 1: Server Component Data Fetching

**What:** Dashboard page is an async Server Component that calls query functions, processes data, and passes results to child components. No client-side data fetching.

**When:** Always -- FOUND-03 requires all data fetched server-side via service_role key.

**Example:**
```typescript
// src/app/(app)/page.tsx
import { getAccounts } from "@/lib/queries/accounts"
import { getRecentTransactions, getCategoryBreakdown } from "@/lib/queries/transactions"
import { detectSuspiciousTransactions } from "@/lib/flags"
import { AccountCard } from "@/components/dashboard/account-card"
import { NetPositionCard } from "@/components/dashboard/net-position-card"
import { CreditUtilization } from "@/components/dashboard/credit-utilization"
import { CategoryChart } from "@/components/dashboard/category-chart"
import { RecentTransactions } from "@/components/dashboard/recent-transactions"

export default async function DashboardPage() {
  const [accounts, recentTxns, categoryData] = await Promise.all([
    getAccounts(),
    getRecentTransactions(30),
    getCategoryBreakdown(14),
  ])

  const flaggedTxns = detectSuspiciousTransactions(recentTxns, accounts)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      {/* Account cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NetPositionCard accounts={accounts} />
        {accounts.map((account) => (
          <AccountCard key={account.id} account={account} />
        ))}
      </div>

      {/* Credit utilization */}
      <CreditUtilization
        accounts={accounts.filter((a) => a.type === "credit")}
      />

      {/* Category chart -- client component for interactivity */}
      <CategoryChart data={categoryData} />

      {/* Recent transactions with flags */}
      <RecentTransactions transactions={flaggedTxns} />
    </div>
  )
}
```

### Pattern 2: Supabase Query Functions

**What:** Centralized query functions in `lib/queries/` that use `createServerSupabase()` and return typed data. Each function handles a specific data need.

**Example:**
```typescript
// src/lib/queries/accounts.ts
import { createServerSupabase } from "@/lib/supabase/server"

export type AccountWithInstitution = {
  id: string
  name: string | null
  type: string
  subtype: string | null
  mask: string | null
  balance_current: number | null
  balance_available: number | null
  balance_limit: number | null
  institution: {
    institution_name: string
  }
}

export async function getAccounts(): Promise<AccountWithInstitution[]> {
  const supabase = createServerSupabase()

  const { data, error } = await supabase
    .from("accounts")
    .select(`
      id, name, type, subtype, mask,
      balance_current, balance_available, balance_limit,
      institution:institutions!inner(institution_name)
    `)
    .order("type")

  if (error) throw new Error(`Failed to fetch accounts: ${error.message}`)
  return data as AccountWithInstitution[]
}
```

```typescript
// src/lib/queries/transactions.ts
import { createServerSupabase } from "@/lib/supabase/server"

export type TransactionFilters = {
  search?: string
  dateFrom?: string
  dateTo?: string
  category?: string
  accountId?: string
  amountMin?: number
  amountMax?: number
  page?: number
  pageSize?: number
}

export async function getTransactions(filters: TransactionFilters) {
  const supabase = createServerSupabase()
  const { page = 1, pageSize = 50 } = filters

  let query = supabase
    .from("transactions")
    .select(`
      id, amount, date, name, merchant_name,
      category_primary, category_detailed,
      payment_channel, is_pending, logo_url,
      account:accounts!inner(id, name, type, mask,
        institution:institutions!inner(institution_name)
      )
    `, { count: "exact" })
    .eq("is_pending", false)
    .order("date", { ascending: false })

  // Search: merchant_name OR raw name
  if (filters.search) {
    query = query.or(
      `merchant_name.ilike.%${filters.search}%,name.ilike.%${filters.search}%`
    )
  }

  // Date range
  if (filters.dateFrom) query = query.gte("date", filters.dateFrom)
  if (filters.dateTo) query = query.lte("date", filters.dateTo)

  // Category
  if (filters.category) query = query.eq("category_primary", filters.category)

  // Account
  if (filters.accountId) query = query.eq("account_id", filters.accountId)

  // Amount range
  if (filters.amountMin != null) query = query.gte("amount", filters.amountMin)
  if (filters.amountMax != null) query = query.lte("amount", filters.amountMax)

  // Pagination
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) throw new Error(`Failed to fetch transactions: ${error.message}`)

  return {
    transactions: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  }
}

export async function getCategoryBreakdown(days: number) {
  const supabase = createServerSupabase()
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabase
    .from("transactions")
    .select("category_primary, amount")
    .gte("date", since.toISOString().split("T")[0])
    .gt("amount", 0) // spending only (positive = spending in Plaid)
    .eq("is_pending", false)

  if (error) throw new Error(`Failed to fetch categories: ${error.message}`)

  // Aggregate by category
  const byCategory = new Map<string, number>()
  for (const txn of data ?? []) {
    const cat = txn.category_primary ?? "UNCATEGORIZED"
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + Number(txn.amount))
  }

  return Array.from(byCategory.entries())
    .map(([category, total]) => ({ category, total: Math.round(total * 100) / 100 }))
    .sort((a, b) => b.total - a.total)
}
```

### Pattern 3: URL Search Params for Server-Side Filtering

**What:** Transaction filters are stored in URL search params. The transactions page reads `searchParams` as a Server Component prop, passes them to query functions, and renders results. Filter UI components are thin client components that update the URL.

**When:** Always for the transactions page -- keeps the page a Server Component, makes filters bookmark-able and shareable, avoids client-side state management.

**Example:**
```typescript
// src/app/(app)/transactions/page.tsx
import { getTransactions } from "@/lib/queries/transactions"
import { getAccounts } from "@/lib/queries/accounts"
import { SearchBar } from "@/components/transactions/search-bar"
import { FilterPanel } from "@/components/transactions/filter-panel"
import { TransactionList } from "@/components/transactions/transaction-list"

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function TransactionsPage({ searchParams }: Props) {
  const params = await searchParams

  const filters = {
    search: typeof params.q === "string" ? params.q : undefined,
    dateFrom: typeof params.from === "string" ? params.from : undefined,
    dateTo: typeof params.to === "string" ? params.to : undefined,
    category: typeof params.category === "string" ? params.category : undefined,
    accountId: typeof params.account === "string" ? params.account : undefined,
    amountMin: params.min ? Number(params.min) : undefined,
    amountMax: params.max ? Number(params.max) : undefined,
    page: params.page ? Number(params.page) : 1,
  }

  const [result, accounts] = await Promise.all([
    getTransactions(filters),
    getAccounts(),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <SearchBar defaultValue={filters.search} />
        <FilterPanel accounts={accounts} currentFilters={filters} />
      </div>
      <TransactionList
        transactions={result.transactions}
        total={result.total}
        page={result.page}
        totalPages={result.totalPages}
      />
    </div>
  )
}
```

```typescript
// src/components/transactions/search-bar.tsx
"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useTransition } from "react"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

export function SearchBar({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const handleSearch = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set("q", value)
      } else {
        params.delete("q")
      }
      params.delete("page") // reset pagination on new search
      startTransition(() => {
        router.push(`/transactions?${params.toString()}`)
      })
    },
    [router, searchParams]
  )

  return (
    <div className="relative flex-1 max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search by merchant or description..."
        defaultValue={defaultValue}
        onChange={(e) => handleSearch(e.target.value)}
        className="pl-9"
      />
    </div>
  )
}
```

### Pattern 4: shadcn/ui Chart with ChartContainer and ChartConfig

**What:** Use shadcn/ui's `ChartContainer` wrapper around Recharts components. The `ChartConfig` object maps data keys to labels and CSS variable colors. This integrates with the existing `--chart-1` through `--chart-5` variables in globals.css.

**When:** For the category breakdown donut chart (DASH-04).

**Example:**
```typescript
// src/components/dashboard/category-chart.tsx
"use client"

import { Pie, PieChart, Cell } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type CategoryData = { category: string; total: number }

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
]

// Map Plaid category codes to readable names
const CATEGORY_LABELS: Record<string, string> = {
  FOOD_AND_DRINK: "Food & Drink",
  TRANSPORTATION: "Transportation",
  SHOPPING: "Shopping",
  ENTERTAINMENT: "Entertainment",
  PERSONAL_CARE: "Personal Care",
  GENERAL_MERCHANDISE: "General",
  INCOME: "Income",
  TRANSFER: "Transfer",
  LOAN_PAYMENTS: "Loan Payments",
  RENT_AND_UTILITIES: "Rent & Utilities",
  UNCATEGORIZED: "Other",
}

export function CategoryChart({ data }: { data: CategoryData[] }) {
  // Build config dynamically from data
  const chartConfig = data.reduce<ChartConfig>((config, item, index) => {
    config[item.category] = {
      label: CATEGORY_LABELS[item.category] ?? item.category,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }
    return config
  }, {})

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Spending by Category</CardTitle>
        <p className="text-sm text-muted-foreground">Last 2 weeks</p>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[280px]">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent />} />
            <Pie
              data={data}
              dataKey="total"
              nameKey="category"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
            >
              {data.map((_, index) => (
                <Cell
                  key={index}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
```

### Pattern 5: Suspicious Transaction Detection (Server-Side Rules)

**What:** Pure computation function that takes transactions and account history, applies three rules, and returns transactions annotated with flag reasons. No ML, no external API.

**Rules:**
1. **Unusually large:** Transaction amount > 2x the median for that account in the last 90 days
2. **New merchant above threshold:** Merchant never seen before (in last 90 days) AND amount > $50
3. **Duplicate charge:** Same merchant_name AND same amount within 48 hours

**Example:**
```typescript
// src/lib/flags.ts

export type SuspiciousFlag = {
  type: "large_amount" | "new_merchant" | "duplicate_charge"
  reason: string
}

export type FlaggedTransaction = {
  // transaction fields...
  flags: SuspiciousFlag[]
}

export function detectSuspiciousTransactions(
  transactions: any[],
  allTransactions90Days: any[]
): FlaggedTransaction[] {
  // Build per-account median map
  const accountMedians = new Map<string, number>()
  const merchantHistory = new Set<string>()

  for (const txn of allTransactions90Days) {
    const key = txn.account?.id ?? txn.account_id
    if (!accountMedians.has(key)) accountMedians.set(key, [])
    // collect amounts for median calculation
    merchantHistory.add(`${txn.merchant_name}`.toLowerCase())
  }

  return transactions.map((txn) => {
    const flags: SuspiciousFlag[] = []

    // Rule 1: Unusually large
    const median = getMedianForAccount(txn.account_id, allTransactions90Days)
    if (median > 0 && txn.amount > median * 2) {
      flags.push({
        type: "large_amount",
        reason: `$${txn.amount} is ${Math.round(txn.amount / median)}x your typical spend`,
      })
    }

    // Rule 2: New merchant above threshold
    const merchantKey = (txn.merchant_name ?? "").toLowerCase()
    if (merchantKey && !merchantHistory.has(merchantKey) && txn.amount > 50) {
      flags.push({
        type: "new_merchant",
        reason: `First transaction with ${txn.merchant_name}`,
      })
    }

    // Rule 3: Duplicate charge (same merchant + amount within 48h)
    const duplicates = transactions.filter(
      (other) =>
        other.id !== txn.id &&
        other.merchant_name === txn.merchant_name &&
        Math.abs(other.amount - txn.amount) < 0.01 &&
        Math.abs(new Date(other.date).getTime() - new Date(txn.date).getTime()) < 48 * 60 * 60 * 1000
    )
    if (duplicates.length > 0) {
      flags.push({
        type: "duplicate_charge",
        reason: `Possible duplicate: same amount at ${txn.merchant_name}`,
      })
    }

    return { ...txn, flags }
  })
}

function getMedianForAccount(accountId: string, transactions: any[]): number {
  const amounts = transactions
    .filter((t) => (t.account?.id ?? t.account_id) === accountId && t.amount > 0)
    .map((t) => t.amount)
    .sort((a, b) => a - b)

  if (amounts.length === 0) return 0
  const mid = Math.floor(amounts.length / 2)
  return amounts.length % 2 !== 0 ? amounts[mid] : (amounts[mid - 1] + amounts[mid]) / 2
}
```

### Anti-Patterns to Avoid

- **Client-side Supabase queries:** Never create a browser Supabase client. All queries go through Server Components using `createServerSupabase()` with the service_role key. This is a security requirement (FOUND-03).
- **`"use client"` on page.tsx:** The dashboard and transactions page files must remain Server Components. Only interactive leaf components (chart wrapper, search input, filter dropdowns) need `"use client"`.
- **Fetching all transactions at once:** Even for a personal app, always paginate. Use `.range()` for the transactions page and date-limit queries for the dashboard.
- **Complex client-side state for filters:** Use URL search params instead. Server Components can read `searchParams` directly, filters become bookmark-able, and there's no client-side state synchronization to manage.
- **Using Recharts 3.x:** Recharts 3 has known `createSlice` errors with React 19.1.x in Next.js 15. shadcn/ui's chart component ships with Recharts 2.x which is stable. Do not upgrade.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chart rendering + theming | Custom SVG/Canvas charts | shadcn/ui chart component (Recharts wrapper) | Handles responsive sizing, dark/light theme via CSS variables, tooltips, accessibility. Already integrated with project's design system. |
| Credit utilization progress bar | Custom div with percentage width | shadcn/ui Progress component | Accessible (aria-valuenow), animated, themed. |
| Date range picker | Custom date inputs with validation | shadcn/ui Calendar + Popover | Calendar widget with range selection, keyboard navigation, proper date handling. |
| Filter dropdown menus | Custom dropdown with state | shadcn/ui Select or Popover | Keyboard accessible, portal rendering, consistent styling. |
| Currency formatting | Manual string concatenation | `Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })` | Handles negative values, proper rounding, locale-aware. |
| Percentage formatting | Manual calculation + display | `Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 0 })` | Consistent display. |

**Key insight:** This phase is a data display layer. Every visual component either exists in shadcn/ui already or can be composed from existing primitives. The real work is in the Supabase queries and data processing.

## Common Pitfalls

### Pitfall 1: Recharts in Server Components

**What goes wrong:** Importing Recharts components (PieChart, BarChart, etc.) directly in a Server Component causes a build error because Recharts uses browser-only APIs (DOM measurement, event listeners).
**Why it happens:** Recharts requires client-side rendering. Server Components cannot use browser APIs.
**How to avoid:** Create a thin client component wrapper (e.g., `category-chart.tsx` with `"use client"`) that receives processed data as props from the parent Server Component. The parent fetches data server-side, the child renders the chart client-side.
**Warning signs:** Build error mentioning `window is not defined` or `document is not defined`.
**Confidence:** HIGH

### Pitfall 2: Supabase Foreign Key Join Syntax

**What goes wrong:** Using incorrect join syntax like `institutions.institution_name` instead of `institution:institutions!inner(institution_name)`.
**Why it happens:** Supabase uses PostgREST embedding syntax, not SQL JOIN syntax. The column name in `select()` refers to the foreign key relationship, not the table name.
**How to avoid:** Use the pattern `alias:foreign_table!inner(columns)`. The alias becomes the key in the returned object. Use `!inner` to exclude rows without matching foreign records.
**Warning signs:** Null nested objects, or error "Could not find a relationship between X and Y".
**Confidence:** HIGH -- verified via Supabase official docs.

### Pitfall 3: Plaid Amount Sign Convention

**What goes wrong:** Showing negative spending amounts or incorrect totals because the developer assumed spending is negative.
**Why it happens:** Plaid uses the convention where **positive amounts = money leaving the account** (spending/debits) and **negative amounts = money entering the account** (income/refunds/credits). This is counterintuitive -- most financial apps show spending as negative.
**How to avoid:** For display: spending amounts are positive in the database, display them as-is with a minus sign or in red. For calculations: `amount > 0` means spending, `amount < 0` means income. Net position uses `balance_current` from accounts, not transaction sums.
**Warning signs:** Category totals showing negative values, or income appearing in spending charts.
**Confidence:** HIGH -- documented in project's schema notes.

### Pitfall 4: Search Params Type Safety in Next.js 15

**What goes wrong:** `searchParams` is a `Promise` in Next.js 15, but the developer destructures it synchronously.
**Why it happens:** Next.js 15 changed `searchParams` from a plain object to a Promise to enable better streaming. Code from Next.js 14 tutorials won't work.
**How to avoid:** Always `await searchParams` in the page component: `const params = await searchParams`.
**Warning signs:** TypeScript error about Promise not being assignable, or runtime error about accessing properties of a Promise.
**Confidence:** HIGH

### Pitfall 5: Missing `.order()` Causing Inconsistent Pagination

**What goes wrong:** Paginated results show duplicate or missing transactions across pages.
**Why it happens:** Without an explicit `.order()`, PostgreSQL returns rows in an undefined order. Combined with `.range()` pagination, this causes non-deterministic page boundaries.
**How to avoid:** Always include `.order("date", { ascending: false })` (or another deterministic column) before `.range()`.
**Warning signs:** Same transaction appearing on page 1 and page 2, or transactions disappearing when navigating pages.
**Confidence:** HIGH

### Pitfall 6: Chart Responsive Container Height

**What goes wrong:** The donut chart renders with zero height or overflows its container.
**Why it happens:** Recharts' `ResponsiveContainer` needs a parent element with a defined height. shadcn's `ChartContainer` handles this, but if you add custom CSS that removes the height constraint, the chart collapses.
**How to avoid:** Use `ChartContainer` with a className that sets aspect ratio or explicit height: `className="mx-auto aspect-square max-h-[280px]"`. Never set `height: auto` or `height: 100%` without a parent that has a fixed height.
**Warning signs:** Chart not visible, or chart overflowing the card.
**Confidence:** MEDIUM

## Code Examples

### Currency Formatter Utility

```typescript
// src/lib/formatters.ts

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date))
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value)
}
```

### Account Card Component

```typescript
// src/components/dashboard/account-card.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/formatters"
import type { AccountWithInstitution } from "@/lib/queries/accounts"

const TYPE_LABELS: Record<string, string> = {
  depository: "Checking/Savings",
  credit: "Credit Card",
  loan: "Loan",
}

export function AccountCard({ account }: { account: AccountWithInstitution }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          {account.institution.institution_name}
        </p>
        <CardTitle className="text-sm font-medium">
          {account.name ?? account.official_name ?? `Account ****${account.mask}`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">
          {formatCurrency(account.balance_current ?? 0)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {TYPE_LABELS[account.type] ?? account.type}
          {account.subtype ? ` - ${account.subtype}` : ""}
        </p>
      </CardContent>
    </Card>
  )
}
```

### Net Position Card

```typescript
// src/components/dashboard/net-position-card.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/formatters"
import type { AccountWithInstitution } from "@/lib/queries/accounts"

export function NetPositionCard({ accounts }: { accounts: AccountWithInstitution[] }) {
  const cash = accounts
    .filter((a) => a.type === "depository")
    .reduce((sum, a) => sum + (a.balance_current ?? 0), 0)

  const credit = accounts
    .filter((a) => a.type === "credit")
    .reduce((sum, a) => sum + (a.balance_current ?? 0), 0)

  const loans = accounts
    .filter((a) => a.type === "loan")
    .reduce((sum, a) => sum + (a.balance_current ?? 0), 0)

  const netPosition = cash - credit - loans

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Net Position</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${netPosition >= 0 ? "text-green-500" : "text-destructive"}`}>
          {formatCurrency(netPosition)}
        </p>
        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
          <p>Cash: {formatCurrency(cash)}</p>
          <p>Credit: -{formatCurrency(credit)}</p>
          <p>Loans: -{formatCurrency(loans)}</p>
        </div>
      </CardContent>
    </Card>
  )
}
```

### Credit Utilization with Progress Bar

```typescript
// src/components/dashboard/credit-utilization.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatCurrency, formatPercent } from "@/lib/formatters"
import type { AccountWithInstitution } from "@/lib/queries/accounts"

export function CreditUtilization({ accounts }: { accounts: AccountWithInstitution[] }) {
  if (accounts.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Credit Utilization</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {accounts.map((account) => {
          const utilization = account.balance_limit
            ? (account.balance_current ?? 0) / account.balance_limit
            : 0
          const isHigh = utilization > 0.3

          return (
            <div key={account.id} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{account.name ?? `****${account.mask}`}</span>
                <span className={isHigh ? "text-destructive" : "text-muted-foreground"}>
                  {formatPercent(utilization)}
                </span>
              </div>
              <Progress
                value={utilization * 100}
                className={isHigh ? "[&>div]:bg-destructive" : ""}
              />
              <p className="text-xs text-muted-foreground">
                {formatCurrency(account.balance_current ?? 0)} / {formatCurrency(account.balance_limit ?? 0)}
              </p>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side data fetching with useEffect | Server Components with async/await | Next.js 13+ App Router (2023) | No loading spinners, no client-side state, instant renders with data |
| `searchParams` as plain object | `searchParams` as Promise | Next.js 15 (2024) | Must `await searchParams` in page components |
| Recharts v2 standalone | shadcn/ui chart component wrapping Recharts v2 | shadcn/ui 2024 | Themed charts, ChartContainer/ChartConfig, CSS variable integration |
| Custom filter state with useState/useReducer | URL search params + Server Components | Next.js App Router pattern | Bookmarkable filters, no hydration mismatch, server-side filtering |

**Deprecated/outdated:**
- `getServerSideProps` / `getStaticProps`: Replaced by Server Components in App Router
- Recharts v3 with React 19: Known `createSlice` errors. Stick with v2.x via shadcn/ui chart component.

## Open Questions

1. **Chart Color Palette Beyond 5 Categories**
   - What we know: `globals.css` defines `--chart-1` through `--chart-5`. Plaid has 15+ primary categories.
   - What's unclear: How to handle more than 5 categories in the donut chart.
   - Recommendation: Group categories beyond top 5 into an "Other" slice. 5-6 slices is the usability sweet spot for donut charts. Use the existing 5 CSS variable colors.

2. **Transaction Count for Suspicious Flag Computation**
   - What we know: The flag detection needs 90 days of historical data to compute medians and merchant history.
   - What's unclear: For a personal app, is 90 days of transactions small enough to fetch in a single query without performance issues?
   - Recommendation: Yes -- a personal user generates ~200-500 transactions per month. 90 days is ~600-1500 rows, well within Supabase's 1000-row default (increase to 2000 via `supabase.from().select().limit(2000)`). Fetch the last 90 days in one query and compute flags in-memory.

3. **Debouncing Search Input**
   - What we know: The search bar triggers a URL change (and server re-render) on each keystroke.
   - What's unclear: Whether this creates too many server requests.
   - Recommendation: Add a 300ms debounce to the search input's onChange handler using a simple `setTimeout`/`clearTimeout` pattern. No debounce library needed.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.x (already installed from Phase 1) |
| Config file | `fintrack-dashboard/vitest.config.ts` (exists) |
| Quick run command | `cd fintrack-dashboard && npx vitest run --reporter=verbose` |
| Full suite command | `cd fintrack-dashboard && npx vitest run && npm run build` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASH-01 | Account cards render with balance, type, institution name | unit | `npx vitest run src/__tests__/account-card.test.tsx` | Wave 0 |
| DASH-02 | Net position computes cash - credit - loans correctly | unit | `npx vitest run src/__tests__/net-position.test.ts` | Wave 0 |
| DASH-03 | Credit utilization renders progress bar with correct percentage | unit | `npx vitest run src/__tests__/credit-utilization.test.tsx` | Wave 0 |
| DASH-04 | Category breakdown chart renders with data | unit | `npx vitest run src/__tests__/category-chart.test.tsx` | Wave 0 |
| DASH-05 | Recent transactions list renders and is expandable | unit | `npx vitest run src/__tests__/recent-transactions.test.tsx` | Wave 0 |
| DASH-06 | Suspicious flag detection rules produce correct flags | unit | `npx vitest run src/__tests__/flags.test.ts` | Wave 0 |
| TXNS-01 | Transaction query builds correct Supabase filter for search | unit | `npx vitest run src/__tests__/transaction-queries.test.ts` | Wave 0 |
| TXNS-02 | Filter panel updates URL search params correctly | unit | `npx vitest run src/__tests__/filter-panel.test.tsx` | Wave 0 |

### Sampling Rate

- **Per task commit:** `cd fintrack-dashboard && npx vitest run --reporter=verbose`
- **Per wave merge:** `cd fintrack-dashboard && npx vitest run && npm run build`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/__tests__/account-card.test.tsx` -- covers DASH-01
- [ ] `src/__tests__/net-position.test.ts` -- covers DASH-02 (pure computation, no render)
- [ ] `src/__tests__/credit-utilization.test.tsx` -- covers DASH-03
- [ ] `src/__tests__/category-chart.test.tsx` -- covers DASH-04
- [ ] `src/__tests__/recent-transactions.test.tsx` -- covers DASH-05
- [ ] `src/__tests__/flags.test.ts` -- covers DASH-06 (pure logic, most valuable test)
- [ ] `src/__tests__/transaction-queries.test.ts` -- covers TXNS-01/TXNS-02 (mock Supabase client)
- [ ] `src/__tests__/filter-panel.test.tsx` -- covers TXNS-02

## Sources

### Primary (HIGH confidence)
- [Supabase JavaScript select() API](https://supabase.com/docs/reference/javascript/select) -- join syntax, filtering, pagination, count queries
- [Supabase Joins and Nesting guide](https://supabase.com/docs/guides/database/joins-and-nesting) -- foreign key embedding
- [shadcn/ui Chart docs](https://ui.shadcn.com/docs/components/radix/chart) -- ChartContainer, ChartConfig, installation
- [shadcn/ui Pie Charts gallery](https://ui.shadcn.com/charts/pie) -- donut chart examples with innerRadius
- [shadcn/ui Data Table docs](https://ui.shadcn.com/docs/components/radix/data-table) -- search/filter patterns

### Secondary (MEDIUM confidence)
- [Recharts React 19 support issue #4558](https://github.com/recharts/recharts/issues/4558) -- react-is override requirement
- [Recharts v3 createSlice error #6316](https://github.com/recharts/recharts/issues/6316) -- avoid Recharts 3.x with React 19
- [Supabase textSearch docs](https://supabase.com/docs/reference/javascript/textsearch) -- ilike vs full text search performance
- [shadcn/ui Recharts v3 upgrade PR #8486](https://github.com/shadcn-ui/ui/pull/8486) -- upgrade in progress, not yet released

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Recharts via shadcn/ui chart component, all other libraries already installed
- Architecture: HIGH -- Server Component data fetching with Supabase is a well-documented pattern; URL search params for filtering is standard Next.js App Router
- Pitfalls: HIGH -- Recharts client-side requirement, Supabase join syntax, Plaid amount convention all verified
- Code examples: MEDIUM -- patterns synthesized from official docs and project schema, not copy-pasted from a verified running app

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (stable stack, no fast-moving dependencies)
