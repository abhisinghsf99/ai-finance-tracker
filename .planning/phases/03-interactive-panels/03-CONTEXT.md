# Phase 3: Interactive Panels - Context

**Gathered:** 2026-03-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Build two interactive collapsible panels on the dashboard: a transaction list with search, filters, sort, and load-more pagination; and a recurring charges panel with auto-detection logic. Both panels live in the existing single-page layout below the charts section. No new pages or navigation changes.

</domain>

<decisions>
## Implementation Decisions

### Design approach
- Use **Stitch MCP (Nano Banana 2)** to generate screen designs following best practices
- Use **ui-ux-pro-max** skill for implementation guidance
- Dark theme with teal/cyan accent (established in Phase 1) — all new components must match

### Transaction panel behavior
- Click header to expand/collapse (accordion pattern)
- **Collapsed state:** Shows 3 most recent transactions + header with count ("Transactions (247)") + footer showing "$XX.XX in the last 3 days"
- **Expanded state:** Shows last 14 days of transactions + footer showing "$XX.XX in the last 14 days"
- "Load more" button at bottom to load the next batch beyond 14 days
- **Filtering rule:** Hide deposits and payments from the transaction list, EXCEPT Zelle payments (those should show)

### Transaction row details
- Each row shows: merchant name, amount, category badge, date, and **account name** (not last 4 digits)
- Two-line layout: merchant + amount on line 1, category + date + account on line 2
- Full detail per TXNS-02 requirements

### Search & filter layout
- Search bar always visible when expanded + Filter button + Sort button in toolbar row
- Search is **instant/debounced** (~300ms) — filters as you type, client-side on loaded transactions
- Filter button opens popover with: date range, category, amount range, account
- Active filters display as dismissible chips below the toolbar
- **Filtered count updates in header:** "Showing 12 of 247 transactions" when filters are active

### Sort control
- Separate sort button (icon) in the toolbar next to Filters
- Dropdown options: Date (newest), Date (oldest), Amount (high to low), Amount (low to high), Merchant A-Z
- Default sort: Date (newest first)

### Recurring charges panel
- Same collapsible pattern as transaction panel
- **Collapsed state:** Header with count ("Recurring Charges (12)") + top 3 recurring charges shown + monthly total at bottom
- **Expanded state:** Full list of all detected recurring charges
- Each entry shows: merchant name, amount, and frequency (monthly/weekly/yearly)
- Sorted by amount, highest first (not grouped by frequency)
- Detection logic: group by merchant_name + rounded amount, COUNT >= 3, infer frequency from charge intervals

### Claude's Discretion
- Monthly total estimate in recurring footer (whether to show and how to calculate)
- Loading skeleton designs for both panels
- Empty state designs
- Responsive behavior (mobile vs desktop)
- Filter popover layout and mobile adaptation
- "Load more" batch size
- Category badge styling (color-coded using existing chart-colors.ts or plain text)
- Account name display format (full name or abbreviated)

</decisions>

<specifics>
## Specific Ideas

- Use Stitch MCP (Nano Banana 2) to generate/iterate on screen designs before implementation
- Collapsible panels should feel consistent — same expand/collapse animation and visual pattern
- Transaction filtering happens client-side on already-loaded data for snappy feel
- Zelle exception for the "hide deposits/payments" rule is important — user wants to see Zelle transfers

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Card` component (shadcn/ui): base for panel containers
- `Sheet` component (shadcn/ui): already used for category drill-down — could inform filter popover pattern
- `Input` component (shadcn/ui): for search bar
- `Button` component (shadcn/ui): for filter/sort triggers
- `Skeleton` component (shadcn/ui): loading states
- `formatCurrency()` from plaid-amounts.ts: amount formatting
- `getCategoryColor()` from chart-colors.ts: category color badges
- `getTransactions()`: already supports limit/offset pagination
- `Transaction` type: has merchant_name, amount, category_primary, date, account_id fields

### Established Patterns
- Server components for data fetching, client components for interactivity
- All Supabase access via service_role key server-side (lib/queries/)
- Client-side filtering pattern established in category-transactions.tsx (Phase 2)
- Dynamic imports with ssr: false for heavy client components (charts-section.tsx pattern)

### Integration Points
- `page.tsx` has `#transactions` section placeholder — replace "Coming in Phase 3" with real components
- MobileNav already anchors to `#transactions` — section must keep this ID
- `getTransactions()` needs account_id joined to account name for display
- Recurring detection needs new query function(s) in lib/queries/transactions.ts

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-interactive-panels*
*Context gathered: 2026-03-11*
