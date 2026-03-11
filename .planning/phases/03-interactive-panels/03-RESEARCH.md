# Phase 3: Interactive Panels - Research

**Researched:** 2026-03-11
**Domain:** Client-side interactive UI panels (collapsible, search, filter, sort) + recurring detection algorithm
**Confidence:** HIGH

## Summary

Phase 3 adds two collapsible panels to the existing single-page dashboard: a transaction list with search/filter/sort and a recurring charges panel with auto-detection. All data is already available via `getTransactions()` and the Supabase `transactions` table. The primary challenge is building rich client-side interactivity (accordion expand/collapse, debounced search, filter popovers, sort dropdowns) while maintaining the established server-component-fetches-then-passes-to-client-component pattern.

The recurring detection algorithm is a pure client-side computation: group transactions by `merchant_name` + rounded `amount`, require COUNT >= 3, and infer frequency from date intervals. This is straightforward but needs merchant name normalization (e.g., "NETFLIX.COM" vs "Netflix") to avoid false splits.

**Primary recommendation:** Fetch all transactions + accounts server-side in `page.tsx`, pass to a client wrapper component that manages panel state, search, filters, and sort entirely client-side. Add shadcn/ui `Collapsible`, `Popover`, `Badge`, and `DropdownMenu` components. Build recurring detection as a pure utility function.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Use **Stitch MCP (Nano Banana 2)** for screen designs, **ui-ux-pro-max** skill for implementation guidance
- Dark theme with teal/cyan accent -- all new components must match
- Transaction panel: click header to expand/collapse (accordion pattern)
- **Collapsed state:** 3 most recent transactions + header with count ("Transactions (247)") + footer "$XX.XX in the last 3 days"
- **Expanded state:** Last 14 days of transactions + footer "$XX.XX in the last 14 days"
- "Load more" button at bottom for batches beyond 14 days
- **Filtering rule:** Hide deposits and payments, EXCEPT Zelle payments (those show)
- Each row: merchant name + amount on line 1, category badge + date + account name on line 2
- Search bar always visible when expanded, instant/debounced (~300ms), client-side
- Filter button opens popover: date range, category, amount range, account
- Active filters show as dismissible chips
- Filtered count updates header: "Showing 12 of 247 transactions"
- Sort button (icon) with dropdown: Date newest/oldest, Amount high/low, Merchant A-Z; default Date newest
- Recurring panel: same collapsible pattern
- **Recurring collapsed:** Header with count + top 3 recurring + monthly total at bottom
- **Recurring expanded:** Full list sorted by amount (highest first)
- Each recurring entry: merchant name, amount, frequency (monthly/weekly/yearly)
- Detection: group by merchant_name + rounded amount, COUNT >= 3, infer frequency

### Claude's Discretion
- Monthly total estimate in recurring footer (whether to show and how to calculate)
- Loading skeleton designs for both panels
- Empty state designs
- Responsive behavior (mobile vs desktop)
- Filter popover layout and mobile adaptation
- "Load more" batch size
- Category badge styling (color-coded using existing chart-colors.ts or plain text)
- Account name display format (full name or abbreviated)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TXNS-01 | Recent transactions in collapsible panel, default collapsed showing count | Collapsible component pattern, accordion state management |
| TXNS-02 | Expanded transactions show merchant name, amount, category, date, account | Transaction row component with two-line layout, account name join |
| TXNS-03 | Search transactions by merchant name or description | Debounced search with useDeferredValue or setTimeout, client-side filtering |
| TXNS-04 | Filter by date range, category, amount range, account | Popover with filter controls, chip display, compound filter logic |
| TXNS-05 | Sort by date, amount, or merchant | DropdownMenu with sort options, stable sort implementation |
| RECR-01 | Recurring charges in collapsible panel, default collapsed showing monthly total | Same collapsible pattern, monthly total calculation |
| RECR-02 | Each recurring entry shows merchant name, amount, frequency, last charge date, charge count | Recurring group data structure with derived fields |
| RECR-03 | Detection groups by merchant_name + rounded amount, COUNT >= 3, frequency inference | Pure utility function with merchant normalization and interval analysis |

</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.5.12 | App Router, server components | Already in use |
| React | 19.1.0 | UI framework | Already in use |
| shadcn/ui | 4.0.3 (base-nova style) | Component primitives | Already in use, has Collapsible/Popover/Badge/DropdownMenu |
| Tailwind CSS | 4.x | Styling | Already in use |
| Lucide React | 0.577.0 | Icons (ChevronDown, Search, Filter, SortAsc, X) | Already in use |
| Supabase JS | 2.99.0 | Database access | Already in use |

### Components to Add (via shadcn CLI)
| Component | Purpose | Why Needed |
|-----------|---------|------------|
| `collapsible` | Expand/collapse panel animation | Core accordion behavior for both panels |
| `popover` | Filter popover overlay | Floating filter controls |
| `badge` | Category badges, filter chips | Visual category indicators and active filter display |
| `dropdown-menu` | Sort options dropdown | Sort selector UI |
| `select` | Account filter, category filter dropdowns | Filter form controls |
| `label` | Filter form labels | Accessibility for filter inputs |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| shadcn Collapsible | Manual div + CSS transition | Collapsible handles a11y (aria-expanded) automatically |
| shadcn Popover | shadcn Sheet (already have) | Popover is better for desktop; Sheet is already used for category drill-down |
| Client-side filtering | Server-side API calls per filter | Client-side is much snappier for ~500 transactions; user explicitly wants instant filtering |

**Installation:**
```bash
cd fintrack-dashboard && npx shadcn@latest add collapsible popover badge dropdown-menu select label
```

## Architecture Patterns

### Recommended Component Structure
```
src/components/dashboard/
  transactions-panel.tsx       # "use client" - main collapsible panel with search/filter/sort
  transactions-toolbar.tsx     # Search bar + filter button + sort button
  transaction-row.tsx          # Single transaction row (two-line layout)
  transaction-filters.tsx      # Filter popover content (date, category, amount, account)
  filter-chips.tsx             # Active filter chips display
  recurring-panel.tsx          # "use client" - recurring charges collapsible panel
  recurring-row.tsx            # Single recurring charge row
src/lib/
  recurring-detection.ts       # Pure function: transactions -> RecurringCharge[]
  queries/transactions.ts      # Extended with getTransactionsWithAccounts()
```

### Pattern 1: Server Fetch + Client Interactive Panel
**What:** Server component (page.tsx) fetches all data, passes to client component that manages expand/collapse, search, filters, sort state.
**When to use:** When interactivity is complex but data set is bounded (~500-1000 records).
**Example:**
```typescript
// page.tsx (server component)
const [transactions, accounts] = await Promise.all([
  getTransactionsWithAccounts(),
  getAccounts(),
])
// Pass to client component
<TransactionsPanel transactions={transactions} accounts={accounts} />
```

### Pattern 2: Client-Side Filtering Pipeline
**What:** Chain filter/search/sort operations on the full transaction array, all in useMemo.
**When to use:** When data fits in memory and user wants instant feedback.
**Example:**
```typescript
// transactions-panel.tsx
const filtered = useMemo(() => {
  let result = transactions
  // 1. Base filter: hide deposits/payments except Zelle
  result = result.filter(t => {
    if (t.amount < 0) {
      // Negative = income/deposit in Plaid convention
      return false
    }
    if (t.category_primary === 'TRANSFER_OUT' || t.category_primary === 'LOAN_PAYMENTS') {
      // Check if it's Zelle
      const name = (t.merchant_name || t.name || '').toLowerCase()
      return name.includes('zelle')
    }
    return true
  })
  // 2. Search filter
  if (searchTerm) {
    const term = searchTerm.toLowerCase()
    result = result.filter(t =>
      (t.merchant_name || '').toLowerCase().includes(term) ||
      (t.name || '').toLowerCase().includes(term)
    )
  }
  // 3. Date range, category, amount, account filters
  // 4. Sort
  return result
}, [transactions, searchTerm, filters, sortOption])
```

### Pattern 3: Debounced Search with useState
**What:** Use a debounce timeout for the search input to avoid filtering on every keystroke.
**When to use:** Search input that triggers expensive operations.
**Example:**
```typescript
const [searchInput, setSearchInput] = useState('')
const [searchTerm, setSearchTerm] = useState('')

useEffect(() => {
  const timer = setTimeout(() => setSearchTerm(searchInput), 300)
  return () => clearTimeout(timer)
}, [searchInput])
```

### Pattern 4: Collapsible Panel with Conditional Rendering
**What:** Use shadcn Collapsible with different content for collapsed vs expanded state.
**When to use:** When collapsed and expanded states show different data (not just hiding content).
**Example:**
```typescript
<Collapsible open={isOpen} onOpenChange={setIsOpen}>
  <CollapsibleTrigger asChild>
    <button className="flex items-center justify-between w-full p-4">
      <span>Transactions ({totalCount})</span>
      <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
    </button>
  </CollapsibleTrigger>
  {/* Always show preview when collapsed */}
  {!isOpen && <CollapsedPreview transactions={recent3} totalSpent={last3DaysTotal} />}
  <CollapsibleContent>
    {/* Full toolbar + list when expanded */}
    <TransactionsToolbar ... />
    <TransactionsList ... />
  </CollapsibleContent>
</Collapsible>
```

### Anti-Patterns to Avoid
- **Fetching per filter change:** Do NOT make server round-trips for each filter/sort. Data is already client-side (~500 transactions). All filtering is client-side per user decision.
- **Separate state per filter:** Use a single filters object `{ dateRange, category, amountRange, account }` instead of 4+ separate useState calls.
- **Re-rendering entire list on search keystroke:** Use debounce (300ms) and `useMemo` to avoid unnecessary work.
- **Forgetting Plaid amount convention:** Positive = spending (money leaving), negative = income. ALWAYS use `plaid-amounts.ts` utilities.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Collapsible animation | CSS transition on height | shadcn `Collapsible` (wraps Radix) | Handles aria-expanded, keyboard, animation timing |
| Filter popover positioning | Absolute positioned div | shadcn `Popover` (wraps Radix) | Handles viewport collision, focus trap, dismissal |
| Sort dropdown | Custom dropdown | shadcn `DropdownMenu` | Keyboard nav, focus management, WAI-ARIA |
| Date range input | Two text inputs | Two native `<input type="date">` or paired Inputs | Sufficient for MVP; no need for a date picker library |
| Debounce utility | npm lodash.debounce | `useEffect` + `setTimeout` pattern | 3 lines of code, no dependency needed |

**Key insight:** shadcn/ui already provides all the interactive primitives needed. No new third-party libraries required beyond what's already installed.

## Common Pitfalls

### Pitfall 1: Plaid Amount Sign Convention
**What goes wrong:** Filtering "hide deposits" by checking `amount < 0` misses that Plaid uses POSITIVE for spending and NEGATIVE for income.
**Why it happens:** Intuitive mental model says positive = income.
**How to avoid:** Use `isSpending()` and `isIncome()` from `plaid-amounts.ts`. For the "hide deposits/payments" rule: filter OUT transactions where `amount < 0` (income), and also filter OUT `TRANSFER_OUT` / `LOAN_PAYMENTS` categories UNLESS merchant contains "zelle".
**Warning signs:** Tests show Zelle transfers missing or deposits appearing.

### Pitfall 2: Zelle Exception Logic
**What goes wrong:** The "hide deposits and payments except Zelle" rule is tricky. Need to understand what "deposits" and "payments" mean in context.
**Why it happens:** User wants to hide: (a) income/deposits (negative amounts), and (b) loan/transfer payments, BUT show Zelle transfers.
**How to avoid:** Implement as a two-step filter:
1. Remove negative amounts (deposits/income)
2. For remaining positive amounts, check if category is payment-like AND not Zelle
The Zelle check should look at `merchant_name` or `name` field for "zelle" case-insensitively.
**Warning signs:** Either too many or too few transactions showing.

### Pitfall 3: Account Name Resolution
**What goes wrong:** Transaction records have `account_id` (UUID) but need to display the account `name`. Without joining, you'd show a UUID.
**Why it happens:** Current `getTransactions()` only selects from the transactions table.
**How to avoid:** Either: (a) join accounts in the query via Supabase `.select('*, accounts(name)')` or (b) fetch accounts separately and create a client-side lookup map `Map<string, string>` from account_id to name.
**Warning signs:** Account column shows UUID or "Unknown".

### Pitfall 4: Merchant Name Normalization for Recurring
**What goes wrong:** "NETFLIX.COM", "Netflix", and "Netflix.com" create separate recurring groups.
**Why it happens:** Plaid returns different merchant_name values depending on the bank.
**How to avoid:** Normalize merchant names before grouping: lowercase, strip common suffixes (.com, .net, Inc, LLC), trim whitespace. Optionally use `merchant_entity_id` (Plaid's stable merchant identifier) when available -- it's the most reliable grouping key.
**Warning signs:** Same merchant appears as multiple recurring entries.

### Pitfall 5: Recurring Frequency Inference
**What goes wrong:** Classifying charges as monthly vs weekly vs yearly incorrectly.
**Why it happens:** Irregular charge dates (e.g., monthly charges on different days), or too-short history.
**How to avoid:** Calculate median interval between charges:
- 25-35 days = monthly
- 5-9 days = weekly
- 13-16 days = biweekly
- 80-400 days = yearly (quarterly falls here too, could refine)
Use median (not average) to be robust against outlier intervals.
**Warning signs:** Monthly Netflix classified as "weekly" due to one anomalous data point.

### Pitfall 6: "Load More" State Management
**What goes wrong:** Load more fetches from server but filters/search reset, or loaded data doesn't integrate with client-side filtering.
**Why it happens:** Mixing server pagination with client-side filtering is architecturally complex.
**How to avoid:** Initial fetch loads a large batch (e.g., 500 transactions). "Load more" appends the next batch to the client-side array. Filters/search always operate on the accumulated client-side array. Keep an offset counter for the next server fetch.
**Warning signs:** Filters break after loading more, or duplicate transactions appear.

## Code Examples

### Transaction Filtering Rule (Zelle Exception)
```typescript
// lib/transaction-filters.ts
import type { Transaction } from '@/lib/queries/types'

/**
 * Apply the base visibility filter:
 * - Hide income/deposits (negative amounts)
 * - Hide payment categories EXCEPT Zelle
 */
export function applyBaseFilter(transactions: Transaction[]): Transaction[] {
  return transactions.filter(t => {
    // Hide deposits/income (negative amount = money entering account)
    if (t.amount < 0) return false

    // Check for payment-like categories to potentially hide
    const paymentCategories = ['TRANSFER_OUT', 'LOAN_PAYMENTS', 'TRANSFER_IN']
    if (paymentCategories.includes(t.category_primary ?? '')) {
      // Exception: show Zelle transfers
      const name = (t.merchant_name || t.name || '').toLowerCase()
      return name.includes('zelle')
    }

    return true
  })
}
```

### Recurring Detection Algorithm
```typescript
// lib/recurring-detection.ts
import type { Transaction } from '@/lib/queries/types'

export interface RecurringCharge {
  merchantName: string
  amount: number          // rounded amount used for grouping
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'yearly'
  lastChargeDate: string
  chargeCount: number
  transactions: Transaction[]
}

function normalizeMerchant(t: Transaction): string {
  // Prefer merchant_entity_id for stable grouping
  if (t.merchant_entity_id) return t.merchant_entity_id
  // Fallback: normalize merchant_name
  return (t.merchant_name || t.name || 'unknown')
    .toLowerCase()
    .replace(/[.,]?\s*(com|net|inc|llc|ltd)$/i, '')
    .trim()
}

function roundAmount(amount: number): number {
  return Math.round(Math.abs(amount) * 100) / 100
}

function inferFrequency(dates: string[]): RecurringCharge['frequency'] {
  if (dates.length < 2) return 'monthly' // default
  const sorted = [...dates].sort()
  const intervals: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    const diff = (new Date(sorted[i]).getTime() - new Date(sorted[i-1]).getTime())
      / (1000 * 60 * 60 * 24)
    intervals.push(diff)
  }
  const median = intervals.sort((a, b) => a - b)[Math.floor(intervals.length / 2)]

  if (median <= 9) return 'weekly'
  if (median <= 18) return 'biweekly'
  if (median <= 45) return 'monthly'
  return 'yearly'
}

export function detectRecurring(transactions: Transaction[]): RecurringCharge[] {
  const groups = new Map<string, Transaction[]>()

  for (const t of transactions) {
    if (t.amount <= 0) continue // only spending
    const key = `${normalizeMerchant(t)}|${roundAmount(t.amount)}`
    const group = groups.get(key) ?? []
    group.push(t)
    groups.set(key, group)
  }

  return Array.from(groups.entries())
    .filter(([, txns]) => txns.length >= 3)
    .map(([, txns]) => {
      const sorted = txns.sort((a, b) => b.date.localeCompare(a.date))
      return {
        merchantName: sorted[0].merchant_name || sorted[0].name || 'Unknown',
        amount: roundAmount(sorted[0].amount),
        frequency: inferFrequency(txns.map(t => t.date)),
        lastChargeDate: sorted[0].date,
        chargeCount: txns.length,
        transactions: sorted,
      }
    })
    .sort((a, b) => b.amount - a.amount) // highest amount first
}
```

### Account Name Lookup Map
```typescript
// In page.tsx or passed as prop
import type { Account } from '@/lib/queries/types'

// Build lookup: account_id -> display name
function buildAccountMap(accounts: Account[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const a of accounts) {
    map.set(a.id, a.name || a.official_name || `Account ${a.mask || 'Unknown'}`)
  }
  return map
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate page for transactions | Single-page scrollable sections | Project decision | All panels live on one page |
| Server-side filtering | Client-side for bounded data (<1000) | React 19 era | Instant feedback, no loading states per filter |
| Custom accordion JS | shadcn Collapsible (Radix primitive) | shadcn v4 | Accessible by default, consistent animation |

**Deprecated/outdated:**
- None relevant -- stack is current.

## Open Questions

1. **Transaction count for initial load**
   - What we know: Current page fetches 500 transactions. With "load more", we need to decide initial batch size.
   - What's unclear: How many transactions the user typically has. 500 may be enough for 14 days + buffer.
   - Recommendation: Keep 500 initial fetch. "Load more" fetches next 200 each time. The 14-day expanded view likely shows < 200 transactions.

2. **Merchant name normalization depth**
   - What we know: `merchant_entity_id` is the best grouping key when available. Fallback is name normalization.
   - What's unclear: What percentage of transactions have `merchant_entity_id` populated by Plaid.
   - Recommendation: Use `merchant_entity_id` as primary key, fall back to normalized `merchant_name`. This is covered in the code example above.

3. **"Monthly total" for recurring footer**
   - What we know: User wants monthly total shown in collapsed state.
   - What's unclear: How to handle weekly (multiply by ~4.33?) and yearly (divide by 12?) charges.
   - Recommendation: Sum all monthly-equivalent amounts: weekly * 4.33, biweekly * 2.17, monthly * 1, yearly / 12. Display as "~$X/mo estimated".

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 + @testing-library/react 16.3.2 |
| Config file | `fintrack-dashboard/vitest.config.ts` |
| Quick run command | `cd fintrack-dashboard && npx vitest run --reporter=verbose` |
| Full suite command | `cd fintrack-dashboard && npx vitest run --reporter=verbose` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TXNS-01 | Collapsible panel renders collapsed with count | unit | `cd fintrack-dashboard && npx vitest run src/__tests__/transactions-panel.test.tsx -x` | No -- Wave 0 |
| TXNS-02 | Transaction row shows merchant, amount, category, date, account | unit | `cd fintrack-dashboard && npx vitest run src/__tests__/transaction-row.test.tsx -x` | No -- Wave 0 |
| TXNS-03 | Search filters by merchant name | unit | `cd fintrack-dashboard && npx vitest run src/__tests__/transactions-panel.test.tsx -x` | No -- Wave 0 |
| TXNS-04 | Filters by date/category/amount/account | unit | `cd fintrack-dashboard && npx vitest run src/__tests__/transaction-filters.test.ts -x` | No -- Wave 0 |
| TXNS-05 | Sort by date/amount/merchant | unit | `cd fintrack-dashboard && npx vitest run src/__tests__/transaction-filters.test.ts -x` | No -- Wave 0 |
| RECR-01 | Recurring panel renders collapsed with monthly total | unit | `cd fintrack-dashboard && npx vitest run src/__tests__/recurring-panel.test.tsx -x` | No -- Wave 0 |
| RECR-02 | Recurring entry shows merchant, amount, frequency, date, count | unit | `cd fintrack-dashboard && npx vitest run src/__tests__/recurring-panel.test.tsx -x` | No -- Wave 0 |
| RECR-03 | Detection groups correctly with frequency inference | unit | `cd fintrack-dashboard && npx vitest run src/__tests__/recurring-detection.test.ts -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `cd fintrack-dashboard && npx vitest run --reporter=verbose`
- **Per wave merge:** `cd fintrack-dashboard && npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/recurring-detection.test.ts` -- covers RECR-03 (pure function, highly testable)
- [ ] `src/__tests__/transaction-filters.test.ts` -- covers TXNS-04, TXNS-05 (filter/sort logic)
- [ ] `src/__tests__/transactions-panel.test.tsx` -- covers TXNS-01, TXNS-03 (panel render + search)
- [ ] `src/__tests__/transaction-row.test.tsx` -- covers TXNS-02 (row display)
- [ ] `src/__tests__/recurring-panel.test.tsx` -- covers RECR-01, RECR-02 (panel render)
- [ ] shadcn components install: `npx shadcn@latest add collapsible popover badge dropdown-menu select label`

## Sources

### Primary (HIGH confidence)
- Project codebase: `fintrack-dashboard/src/` -- all existing patterns, types, queries, components
- `supabase-migration.sql` -- database schema, indexes, column types
- `03-CONTEXT.md` -- all user decisions for this phase
- `REQUIREMENTS.md` -- formal requirement definitions

### Secondary (MEDIUM confidence)
- shadcn/ui component library -- Collapsible, Popover, Badge, DropdownMenu are standard components in the library (verified via components.json config showing base-nova style)
- Plaid API conventions -- positive = debit, negative = credit (verified in project's plaid-amounts.ts)

### Tertiary (LOW confidence)
- Recurring detection algorithm -- the merchant normalization and frequency inference logic is based on common patterns for personal finance apps. May need tuning once real data is observed.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed, only adding shadcn components
- Architecture: HIGH -- follows established patterns from Phase 2 (server fetch + client interactive)
- Pitfalls: HIGH -- identified from direct code review of existing codebase and Plaid conventions
- Recurring detection: MEDIUM -- algorithm is sound but normalization may need tuning on real data

**Research date:** 2026-03-11
**Valid until:** 2026-04-11 (stable -- no fast-moving dependencies)
