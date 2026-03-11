---
phase: 03-interactive-panels
plan: 02
subsystem: ui
tags: [react, collapsible, debounce, filter, sort, transactions, shadcn]

# Dependency graph
requires:
  - phase: 03-interactive-panels
    plan: 01
    provides: "Transaction filter/sort pipeline, TransactionWithAccount type, shadcn components"
  - phase: 01-foundation
    provides: "plaid-amounts formatCurrency, chart-colors getCategoryColor"
provides:
  - "TransactionsPanel collapsible component with collapsed/expanded states"
  - "TransactionRow two-line layout with category badge"
  - "TransactionsToolbar with search, filter button, sort dropdown"
  - "TransactionFilterPopover with date/category/amount/account controls"
  - "FilterChips dismissible active filter display"
affects: [03-03-PLAN, dashboard-page]

# Tech tracking
tech-stack:
  added: []
  patterns: [debounced-search, filter-pipeline-composition, collapsible-panel, controlled-popover]

key-files:
  created:
    - fintrack-dashboard/src/components/dashboard/transactions-panel.tsx
    - fintrack-dashboard/src/components/dashboard/transaction-row.tsx
    - fintrack-dashboard/src/components/dashboard/transactions-toolbar.tsx
    - fintrack-dashboard/src/components/dashboard/transaction-filters.tsx
    - fintrack-dashboard/src/components/dashboard/filter-chips.tsx
    - fintrack-dashboard/src/__tests__/transaction-row.test.tsx
    - fintrack-dashboard/src/__tests__/transactions-panel.test.tsx
  modified: []

key-decisions:
  - "Inline styled category badges instead of shadcn Badge (simpler API for dynamic HSL colors)"
  - "Category name formatting: lowercase then title case for readable display of Plaid constants"
  - "Spending totals use >= cutoff date (inclusive of cutoff day)"

patterns-established:
  - "Debounced search: useEffect + setTimeout 300ms pattern for search input"
  - "Filter pipeline composition: base -> search -> filter -> sort in useMemo"
  - "Controlled popover: parent manages open state for external trigger button"

requirements-completed: [TXNS-01, TXNS-02, TXNS-03, TXNS-04, TXNS-05]

# Metrics
duration: 4min
completed: 2026-03-11
---

# Phase 3 Plan 2: Transaction Panel UI Summary

**Collapsible transaction panel with debounced search, filter popover with chips, sort dropdown, and two-line transaction rows with category badges**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-11T22:08:10Z
- **Completed:** 2026-03-11T22:11:47Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Collapsible panel: collapsed shows 3 recent transactions + 3-day spending total, expanded shows 14-day list + toolbar
- Full filter pipeline UI: debounced search, filter popover (date/category/amount/account), dismissible chips, sort dropdown (5 options)
- Transaction row with two-line layout: merchant+amount, category badge+date+account name
- 13 new tests (5 transaction-row + 8 transactions-panel), 94 total tests green

## Task Commits

Each task was committed atomically:

1. **Task 1: Transaction row, toolbar, filter popover, filter chips** - `c324c8a` (feat)
2. **Task 2: Transactions panel with collapsible states and debounced search** - `dee48e2` (feat)

## Files Created/Modified
- `src/components/dashboard/transaction-row.tsx` - Two-line layout with merchant, amount, category badge, date, account
- `src/components/dashboard/transactions-toolbar.tsx` - Search input + filter button + sort dropdown
- `src/components/dashboard/transaction-filters.tsx` - Popover with date range, category, amount range, account select
- `src/components/dashboard/filter-chips.tsx` - Dismissible cyan-accent filter chips
- `src/components/dashboard/transactions-panel.tsx` - Main collapsible panel with state management and filter pipeline
- `src/__tests__/transaction-row.test.tsx` - 5 tests for row rendering and fallbacks
- `src/__tests__/transactions-panel.test.tsx` - 8 tests for panel behaviors

## Decisions Made
- Used inline styled spans for category badges instead of shadcn Badge (the Badge component uses base-ui/react useRender API which makes dynamic HSL background colors harder to apply)
- Category name formatting: lowercase then title case to convert "FOOD_AND_DRINK" to "Food And Drink"
- Spending totals are inclusive of the cutoff date (>= comparison)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed category name formatting**
- **Found during:** Task 1 (transaction-row.tsx)
- **Issue:** Initial regex `\b\w` with `toUpperCase()` didn't work on all-caps Plaid categories -- produced "FOOD AND DRINK" instead of "Food And Drink"
- **Fix:** Added `.toLowerCase()` before title-casing
- **Files modified:** transaction-row.tsx, filter-chips.tsx, transaction-filters.tsx
- **Verification:** All tests pass with correct title case output
- **Committed in:** c324c8a (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor formatting bug, no scope creep.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Transaction panel ready for integration into dashboard page
- All TXNS-* requirements fulfilled
- Plan 03 (recurring charges panel) can proceed independently
- 94 tests green, no regressions

## Self-Check: PASSED

All 7 files verified present. Both commit hashes verified in git log.

---
*Phase: 03-interactive-panels*
*Completed: 2026-03-11*
