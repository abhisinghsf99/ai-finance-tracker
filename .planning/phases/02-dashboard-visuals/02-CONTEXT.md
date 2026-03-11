# Phase 2: Dashboard Visuals - Context

**Gathered:** 2026-03-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Populate the Summary and Accounts sections with real financial data from Supabase. Summary cards (current month spending, last month with % change, transaction count), account cards (name, last 4, balance, type), net position card, credit utilization bars. Add spending trend bar chart (trailing 6 months) and category donut chart with drill-down. No new navigation or layout changes — Phase 1 established the single-page shell.

</domain>

<decisions>
## Implementation Decisions

### Design approach
- Use **Stitch MCP (Nano Banana 2)** to generate screen designs following best practices
- Use **ui-ux-pro-max** skill for implementation guidance
- Dark theme with teal/cyan accent (established in Phase 1) — all new components must match
- Copilot-style aesthetic: warm, approachable fintech with rounded cards, soft gradients

### Summary cards
- Show current month spending, last month spending with % change, and transaction count
- Net position card: total cash minus total credit minus total loans
- Cards should feel information-dense but not cluttered

### Account cards
- Each account: name, last 4 digits (mask field), balance, account type
- Credit utilization bars color-coded: green (<30%), amber (30-70%), red (>70%)
- Visual distinction between checking, credit, and loan accounts

### Charts
- Monthly spending trend: bar chart, trailing 6 months, hover for exact amounts
- Category donut: current month spending by category_primary with legend
- Muted harmonious palette with 10+ distinct category colors
- Charts use Recharts with dynamic import (no SSR) per Phase 1 research

### Category drill-down
- Clicking a donut category shows its transactions (CHRT-03)
- Specific UX pattern (modal, inline, panel) at Claude's discretion based on Stitch MCP best practices

### Claude's Discretion
- Summary card layout arrangement (grid sizing, responsive breakpoints)
- Account card visual design details (icons, borders, spacing)
- Chart sizing and placement (side by side vs stacked)
- Category drill-down interaction pattern
- Loading skeleton designs
- Empty state designs
- Responsive behavior details (mobile vs desktop chart sizing)

</decisions>

<specifics>
## Specific Ideas

- Use Stitch MCP (Nano Banana 2) to generate/iterate on screen designs before implementation
- Follow fintech dashboard best practices for data visualization
- Copilot-style aesthetic reference — warm, modern, approachable
- Teal/cyan accent for key metrics and interactive elements

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Card` component (shadcn/ui): base for all dashboard cards
- `Skeleton` component (shadcn/ui): loading states for cards and charts
- `plaid-amounts.ts`: 6 utility functions for amount formatting and sign convention
- `getAccounts()`, `getTransactions()`, `getMonthlySpending()`: typed query functions
- `getInstitutions()`: institution data for account grouping

### Established Patterns
- Server components for data fetching, client components only for interactivity
- All Supabase access via service_role key server-side (lib/queries/)
- Dark theme CSS variables in globals.css — teal/cyan accent colors defined
- Section shells exist: `#summary` and `#accounts` sections in page.tsx ready to fill

### Integration Points
- `page.tsx` has placeholder sections — replace "Coming in Phase 2" with real components
- MobileNav anchors to `#summary` and `#accounts` — sections must keep these IDs
- Recharts needs to be added as dependency with `react-is` override for React 19

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-dashboard-visuals*
*Context gathered: 2026-03-11*
