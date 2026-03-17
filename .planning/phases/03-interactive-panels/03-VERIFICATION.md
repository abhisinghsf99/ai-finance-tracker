---
phase: 03-interactive-panels
verified: 2026-03-11T15:20:00Z
status: gaps_found
score: 7/8 must-haves verified
re_verification: false
gaps:
  - truth: "Each recurring entry shows merchant name, amount, and frequency"
    status: partial
    reason: "RECR-02 requires last charge date and charge count to also appear in each recurring row. recurring-row.tsx renders only merchant name, amount, and frequency badge. The lastChargeDate and chargeCount fields exist on RecurringCharge but are never read or rendered by the component."
    artifacts:
      - path: "fintrack-dashboard/src/components/dashboard/recurring-row.tsx"
        issue: "lastChargeDate and chargeCount props are available on RecurringCharge but not rendered in JSX"
    missing:
      - "Render charge.lastChargeDate (formatted) in recurring-row.tsx"
      - "Render charge.chargeCount (e.g. '4x') in recurring-row.tsx"
---

# Phase 3: Interactive Panels Verification Report

**Phase Goal:** Users can explore their full transaction history with search and filters, and see automatically detected recurring charges
**Verified:** 2026-03-11T15:20:00Z
**Status:** gaps_found — 1 gap
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Transaction base filter hides deposits and payment categories except Zelle | VERIFIED | `applyBaseFilter` in transaction-filters.ts: removes `amount < 0`, removes TRANSFER_OUT/LOAN_PAYMENTS/TRANSFER_IN unless `isZelle()` returns true; 6 tests pass |
| 2 | Search filter matches merchant_name and name case-insensitively | VERIFIED | `searchTransactions` trims, lowercases, and checks both fields; 6 tests pass |
| 3 | Date range, category, amount range, and account filters work in combination | VERIFIED | `filterTransactions` applies all non-undefined filters; 6 tests including combined filter test pass |
| 4 | Sort works by date, amount, and merchant in both directions | VERIFIED | `sortTransactions` supports all 5 SortOption values; 6 tests pass including immutability check |
| 5 | Recurring detection groups by normalized merchant + rounded amount with COUNT >= 3 | VERIFIED | `detectRecurring` uses normalizeMerchant + roundAmount key, filters `>= 3`; 9 tests pass covering normalization, entity ID grouping, threshold |
| 6 | Transaction panel collapses/expands with correct counts, 3-day/14-day totals, debounced search, filter chips, and sort | VERIFIED | Full collapsible implementation in transactions-panel.tsx; 8 tests pass covering collapse state, search debounce, filtered header, load more |
| 7 | Recurring panel collapses/expands showing top 3 charges and estimated monthly total | VERIFIED | recurring-panel.tsx with isOpen state, previewCharges.slice(0, 3), estimateMonthlyTotal; 6 tests pass |
| 8 | Each recurring entry shows merchant name, amount, frequency, last charge date, and charge count | FAILED | recurring-row.tsx renders merchant name, amount, and frequency badge only. lastChargeDate and chargeCount are available on RecurringCharge but never rendered. RECR-02 is partially unsatisfied. |

**Score:** 7/8 truths verified

---

## Required Artifacts

| Artifact | Min Lines | Actual Lines | Status | Details |
|----------|-----------|--------------|--------|---------|
| `fintrack-dashboard/src/lib/transaction-filters.ts` | — | 133 | VERIFIED | Exports applyBaseFilter, searchTransactions, filterTransactions, sortTransactions, TransactionFilters, SortOption; all generic with `<T extends Transaction>` |
| `fintrack-dashboard/src/lib/recurring-detection.ts` | — | 108 | VERIFIED | Exports detectRecurring, estimateMonthlyTotal, RecurringCharge interface |
| `fintrack-dashboard/src/lib/queries/transactions.ts` | — | 185 | VERIFIED | Exports TransactionWithAccount and getTransactionsWithAccounts with Supabase relation join |
| `fintrack-dashboard/src/__tests__/transaction-filters.test.ts` | — | 221 | VERIFIED | 26 tests, all passing |
| `fintrack-dashboard/src/__tests__/recurring-detection.test.ts` | — | 198 | VERIFIED | 13 tests, all passing |
| `fintrack-dashboard/src/components/dashboard/transactions-panel.tsx` | 80 | 252 | VERIFIED | Full collapsible with state management, debounce, filter pipeline, load-more |
| `fintrack-dashboard/src/components/dashboard/transaction-row.tsx` | 20 | 62 | VERIFIED | Two-line layout: merchant+amount, category badge+date+account |
| `fintrack-dashboard/src/components/dashboard/transactions-toolbar.tsx` | 30 | 94 | VERIFIED | Search input + filter button with count badge + sort dropdown with 5 options |
| `fintrack-dashboard/src/components/dashboard/transaction-filters.tsx` | 40 | 210 | VERIFIED | Popover with date range, category select, amount range, account select, clear/apply buttons |
| `fintrack-dashboard/src/components/dashboard/filter-chips.tsx` | 15 | 94 | VERIFIED | Dismissible chips for all 4 filter types with X button |
| `fintrack-dashboard/src/components/dashboard/recurring-panel.tsx` | 50 | 90 | VERIFIED | Collapsible with detectRecurring useMemo, top 3 preview, monthly total footer |
| `fintrack-dashboard/src/components/dashboard/recurring-row.tsx` | 15 | 35 | STUB (partial) | Renders merchant, amount, frequency badge — missing lastChargeDate and chargeCount rendering |
| `fintrack-dashboard/src/app/(app)/page.tsx` | — | 110 | VERIFIED | Fetches getTransactionsWithAccounts + getAccounts, renders TransactionsPanel and RecurringPanel with real data, section id="transactions" preserved |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| transaction-filters.ts | queries/types.ts | imports Transaction type | WIRED | `import type { Transaction } from "@/lib/queries/types"` line 1 |
| recurring-detection.ts | queries/types.ts | imports Transaction type | WIRED | `import type { Transaction } from "@/lib/queries/types"` line 1 |
| transactions-panel.tsx | transaction-filters.ts | imports filter/sort pipeline | WIRED | Imports applyBaseFilter, searchTransactions, filterTransactions, sortTransactions, SortOption, TransactionFilters |
| transaction-row.tsx | chart-colors.ts | imports getCategoryColor | WIRED | `import { getCategoryColor } from "@/lib/chart-colors"` |
| transactions-panel.tsx | plaid-amounts.ts | imports formatCurrency | WIRED | `import { formatCurrency } from "@/lib/plaid-amounts"` |
| recurring-panel.tsx | recurring-detection.ts | imports detectRecurring and estimateMonthlyTotal | WIRED | `import { detectRecurring, estimateMonthlyTotal } from "@/lib/recurring-detection"` |
| page.tsx | queries/transactions.ts | imports getTransactionsWithAccounts | WIRED | Import on line 11, called in Promise.all on line 30 |
| page.tsx | transactions-panel.tsx | renders TransactionsPanel | WIRED | `<TransactionsPanel transactions={transactionsWithAccounts} accounts={accountsList} />` |
| page.tsx | recurring-panel.tsx | renders RecurringPanel | WIRED | `<RecurringPanel transactions={transactionsWithAccounts} />` |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| TXNS-01 | 03-02 | Recent transactions in collapsible panel, default collapsed showing count | SATISFIED | TransactionsPanel renders collapsed by default (`useState(false)`), header shows `Transactions ({count})` |
| TXNS-02 | 03-02 | Expanded transactions show merchant name, amount, category, date, account (last 4) | SATISFIED | TransactionRow line 1: merchant + amount; line 2: category badge + date + account_name |
| TXNS-03 | 03-01, 03-02 | Search transactions by merchant name or description | SATISFIED | searchTransactions filters on merchant_name and name; debounced in TransactionsPanel |
| TXNS-04 | 03-01, 03-02 | Filter by date range, category, amount range, and account | SATISFIED | filterTransactions + TransactionFilterPopover implement all 4 filter types |
| TXNS-05 | 03-01, 03-02 | Sort by date, amount, or merchant | SATISFIED | sortTransactions supports 5 options (date desc/asc, amount desc/asc, merchant asc); sort dropdown in toolbar |
| RECR-01 | 03-03 | Recurring charges in collapsible panel, default collapsed showing monthly total | SATISFIED | RecurringPanel collapses by default, footer shows `~{formatCurrency(monthlyTotal)}/mo estimated` |
| RECR-02 | 03-03 | Each recurring entry shows merchant name, amount, frequency, last charge date, charge count | BLOCKED | recurring-row.tsx renders merchant name, amount, and frequency badge only. lastChargeDate and chargeCount fields on RecurringCharge are never rendered. Requirement text explicitly lists all 5 fields. |
| RECR-03 | 03-01 | Detection groups by merchant_name + rounded amount with COUNT >= 3 and frequency inference | SATISFIED | detectRecurring: groups by normalizeMerchant + roundAmount key, filters `txns.length >= 3`, calls inferFrequency (median interval) |

**Requirements summary:** 7/8 satisfied. RECR-02 is partially blocked — the data model and detection algorithm are complete, but the UI does not surface two of the five required display fields.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `fintrack-dashboard/src/components/dashboard/filter-chips.tsx` | 28 | `categories` parameter defined but never used (ESLint warning on build) | Info | No functional impact; prop accepted but not used in rendering |

No TODO/FIXME/placeholder comments found in any phase 3 files. No empty return stubs. No console.log-only implementations.

---

## Human Verification Required

### 1. Visual Layout — Transaction Row

**Test:** Open the dashboard on a real device or browser. Expand the Transactions panel. Examine a transaction row.
**Expected:** Line 1 shows merchant name left-aligned, formatted dollar amount right-aligned. Line 2 shows a colored category badge, the date formatted as "Mar 11, 2026", and the account name in muted text.
**Why human:** Dynamic HSL badge colors and layout alignment cannot be verified programmatically.

### 2. Filter Popover Interaction

**Test:** Click the Filter button in the toolbar. Set a date range and a category. Click Apply. Verify chips appear. Click X on a chip.
**Expected:** Popover closes on Apply. Chips appear for each active filter. Clicking X removes that filter and updates the transaction list.
**Why human:** Popover open/close behavior and chip dismissal require interactive DOM state that vitest tests mock partially.

### 3. Debounce Timing Feel

**Test:** Type rapidly into the search box. Observe when the transaction list updates.
**Expected:** List updates approximately 300ms after the user stops typing, not on every keystroke.
**Why human:** Timer behavior in a real browser differs from fake timer tests; perceived lag requires human judgment.

### 4. Mobile Responsive Layout

**Test:** Open on a mobile viewport (< 640px). Check filter popover width and bottom navigation anchors.
**Expected:** Filter popover spans nearly full width. Mobile bottom nav "Transactions" link scrolls to the transactions section.
**Why human:** Responsive CSS breakpoints require real viewport.

---

## Gaps Summary

One gap blocks full RECR-02 satisfaction:

**RECR-02 — Last charge date and charge count not rendered in RecurringRow**

The requirement states: "Each recurring entry shows merchant name, amount, frequency, last charge date, charge count."

`recurring-row.tsx` renders only merchant name, amount, and the frequency badge. The `RecurringCharge` interface (correctly defined in recurring-detection.ts) already includes `lastChargeDate: string` and `chargeCount: number`, so the data is available — it is simply not read or displayed by the component.

This is a display gap only. The detection algorithm, data model, and wiring are all correct. Fix requires adding two display elements to `recurring-row.tsx`.

---

*Verified: 2026-03-11T15:20:00Z*
*Verifier: Claude (gsd-verifier)*
