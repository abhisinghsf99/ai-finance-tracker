# Phase 1: Foundation and Layout - Research

**Researched:** 2026-03-10
**Domain:** Next.js App Router auth, dark theme, single-page layout, Supabase typed query layer, Vercel deployment
**Confidence:** HIGH

## Summary

Phase 1 builds on a partially-existing Next.js 15 + Tailwind v4 + shadcn/ui codebase. The project already has: a login page with password auth, a 30-day session cookie, middleware-based route protection, a Supabase server client using service_role, Satoshi font loaded, and a dark theme CSS variable system. However, the current layout uses a **sidebar + multi-page routing** pattern (Dashboard, Transactions, Recurring, Chat as separate routes) which conflicts with the requirements calling for a **single scrollable page with top nav bar + mobile bottom tab bar**. The layout needs restructuring from multi-page sidebar to single-page top-nav.

Additionally, the codebase includes `next-themes` and a `ThemeToggle` component that must be removed (dark-only requirement). The typed query layer (`lib/queries/`) and Plaid amount utilities (`lib/plaid-amounts.ts`) do not exist yet and must be created. Vercel deployment has not been configured.

**Primary recommendation:** Refactor the existing layout from sidebar+routes to single-page top-nav, remove theme-switching infrastructure, create the data access layer, and deploy to Vercel. Most auth work is already done -- focus efforts on layout restructuring and data layer.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FOUND-01 | Project initializes with Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui | DONE -- already initialized with Next.js 15.5.12, React 19.1, TS 5, Tailwind v4, shadcn v4. No action needed. |
| FOUND-02 | Password-protected login with 30-day session cookie and sign out | MOSTLY DONE -- login page, auth API route, middleware, 30-day cookie all exist. Missing: sign-out functionality (DELETE route + UI button). |
| FOUND-03 | All Supabase reads go through server-side service_role key (no anon key in browser) | PARTIALLY DONE -- `createServerSupabase()` exists in `lib/supabase/server.ts`. Need to verify no browser-side Supabase client exists and build query functions on top. |
| FOUND-04 | Typed query layer in lib/queries/ with Plaid amount convention utilities | NOT STARTED -- `lib/queries/` directory doesn't exist. `lib/plaid-amounts.ts` doesn't exist. Database schema is known (see SQL migration). |
| FOUND-05 | Dark theme only with teal/cyan accent, Copilot-style aesthetic, neo-grotesque font | PARTIALLY DONE -- dark theme CSS variables with teal/cyan accent defined in globals.css. Satoshi font loaded. Must remove `next-themes`, `ThemeProvider`, `ThemeToggle`. Must hardcode `class="dark"` on `<html>`. |
| LAYO-01 | Single scrollable page with top nav bar (logo left, sign out right) | NOT STARTED -- current layout uses sidebar. Need new top nav component and single-page structure. |
| LAYO-02 | Desktop: single column with max-width container | NOT STARTED -- current layout uses sidebar flex. Need `max-w-6xl mx-auto` container pattern. |
| LAYO-03 | Mobile: compact top nav, bottom tab bar for section jumps (Summary, Accounts, Transactions, Chat) | PARTIALLY DONE -- `MobileNav` component exists with bottom tab bar, but uses router Links to separate pages. Must change to anchor-link section jumps within single page. |
| LAYO-04 | Deployed to Vercel with environment variables configured | NOT STARTED -- no Vercel project exists. Need deployment config + env vars. |
</phase_requirements>

## Standard Stack

### Core (Already Installed)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| Next.js | 15.5.12 | App Router framework | Installed |
| React | 19.1.0 | UI library | Installed |
| TypeScript | ^5 | Type safety | Installed |
| Tailwind CSS | ^4 | Utility styling | Installed |
| shadcn/ui | ^4.0.3 | Component library | Installed |
| @supabase/supabase-js | ^2.99.0 | Database client | Installed |
| lucide-react | ^0.577.0 | Icons | Installed |
| Vitest | ^4.0.18 | Test runner | Installed |

### To Remove

| Library | Why Remove |
|---------|-----------|
| next-themes | Dark-only app, no theme switching needed |

### Nothing New to Install for Phase 1

Phase 1 does not require any new npm packages. All dependencies are already present. Recharts, AI SDK, etc. are needed in later phases.

## Architecture Patterns

### Current Layout (MUST CHANGE)

```
app/(app)/layout.tsx    -- Sidebar + MobileNav + multi-page routes
app/(app)/page.tsx      -- Dashboard route
app/(app)/transactions/ -- Separate page
app/(app)/recurring/    -- Separate page
app/(app)/chat/         -- Separate page
```

### Target Layout (Single Scrollable Page)

```
app/(app)/layout.tsx    -- TopNav only (no sidebar)
app/(app)/page.tsx      -- Single page with all sections as components
                           Each section has an id="" for anchor navigation
```

The bottom tab bar on mobile should use `#summary`, `#accounts`, `#transactions`, `#chat` anchor links to scroll to sections rather than navigating to separate routes. The separate route pages (`/transactions`, `/recurring`, `/chat`) become unnecessary for Phase 1 -- they can be removed or left as placeholders. The single `page.tsx` imports section shell components that will be populated in later phases.

### Pattern 1: Top Nav with Sign Out

**What:** Horizontal top nav bar replacing the sidebar
**Structure:**
```typescript
// components/layout/top-nav.tsx
"use client"
export function TopNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <span className="text-lg font-bold text-primary">FinTrack</span>
        <SignOutButton />
      </div>
    </header>
  )
}
```

### Pattern 2: Section Anchor Navigation (Mobile Bottom Tab Bar)

**What:** Bottom tab bar that scrolls to sections instead of navigating pages
**Key change:** Replace `<Link href="/transactions">` with `<a href="#transactions">` and use `scroll-behavior: smooth` or `scrollIntoView()`.

```typescript
const navItems = [
  { href: "#summary", icon: LayoutDashboard, label: "Summary" },
  { href: "#accounts", icon: Wallet, label: "Accounts" },
  { href: "#transactions", icon: ArrowLeftRight, label: "Transactions" },
  { href: "#chat", icon: MessageSquare, label: "Chat" },
]
```

### Pattern 3: Sign Out Flow

**What:** Cookie deletion via API route + redirect
```typescript
// app/api/auth/route.ts -- add DELETE handler
export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.set({
    name: "fintrack-session",
    value: "",
    maxAge: 0,
    path: "/",
  })
  return response
}

// Sign out button calls:
await fetch("/api/auth", { method: "DELETE" })
router.push("/login")
```

### Pattern 4: Dark Theme Hardcoding (Remove next-themes)

**What:** Eliminate runtime theme switching, hardcode dark class
```typescript
// app/layout.tsx -- BEFORE (current)
<html lang="en" className={satoshi.variable} suppressHydrationWarning>
  <body>
    <ThemeProvider attribute="class" defaultTheme="dark" ...>
      {children}
    </ThemeProvider>
  </body>
</html>

// app/layout.tsx -- AFTER
<html lang="en" className={`${satoshi.variable} dark`}>
  <body className="font-sans antialiased bg-background text-foreground">
    {children}
  </body>
</html>
```

Files to delete: `components/theme-provider.tsx`, `components/layout/theme-toggle.tsx`
Package to remove: `next-themes`

### Pattern 5: Typed Query Layer

**What:** Centralized Supabase queries with TypeScript types matching the database schema
**Structure:**
```
lib/
  supabase/
    server.ts           -- existing createServerSupabase()
  queries/
    types.ts            -- Database row types (Institution, Account, Transaction)
    accounts.ts         -- getAccounts(), getAccountById()
    transactions.ts     -- getTransactions(), getMonthlySpending(), etc.
    institutions.ts     -- getInstitutions()
  plaid-amounts.ts      -- isSpending(), isIncome(), displayAmount(), formatCurrency()
```

### Pattern 6: Database Types

**What:** TypeScript interfaces matching the Supabase schema. Derived from the migration SQL.

```typescript
// lib/queries/types.ts
export interface Institution {
  id: string
  plaid_item_id: string
  institution_name: string
  institution_id: string
  status: "active" | "error" | "login_required"
  created_at: string
  updated_at: string
}

export interface Account {
  id: string
  plaid_account_id: string
  institution_id: string
  name: string | null
  official_name: string | null
  type: string           // "credit" | "depository" | "loan"
  subtype: string | null // "credit card" | "checking" | "savings" | "auto"
  mask: string | null    // last 4 digits
  balance_available: number | null
  balance_current: number | null
  balance_limit: number | null
  balance_updated_at: string | null
  created_at: string
}

export interface Transaction {
  id: string
  plaid_transaction_id: string
  account_id: string
  amount: number          // positive = spending, negative = income
  date: string            // YYYY-MM-DD
  datetime: string | null
  name: string | null
  merchant_name: string | null
  merchant_entity_id: string | null
  category_primary: string | null
  category_detailed: string | null
  payment_channel: string | null
  is_pending: boolean
  pending_transaction_id: string | null
  iso_currency_code: string
  logo_url: string | null
  website: string | null
  created_at: string
  updated_at: string
}
```

### Anti-Patterns to Avoid

- **Creating a browser-side Supabase client:** All queries must go through `createServerSupabase()` in Server Components or API routes. Never import supabase in a `"use client"` file.
- **Using `NEXT_PUBLIC_` prefix for service_role key:** The key must remain server-only.
- **Making `page.tsx` a client component:** The main dashboard page should be a Server Component that fetches data and passes to client islands.
- **Adding `useEffect` + fetch for data:** Use server-side data fetching in the page component, not client-side effects.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Amount formatting | Custom string manipulation | `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })` | Handles thousands separators, decimal places, currency symbols correctly |
| Date formatting | Manual date string parsing | `Intl.DateTimeFormat` or simple string split on Plaid dates (YYYY-MM-DD) | Plaid dates are plain dates (not timestamps) -- avoid timezone conversion bugs |
| Cookie session | Custom cookie parsing | Next.js `cookies()` API + middleware | Already implemented correctly in the codebase |
| Dark theme class | Runtime theme detection | Hardcode `class="dark"` on `<html>` | Single-theme app, no detection needed |

## Common Pitfalls

### Pitfall 1: Layout Restructuring Breaks Existing Tests
**What goes wrong:** Sidebar and theme-toggle tests exist (`__tests__/sidebar.test.tsx`, `__tests__/theme-toggle.test.tsx`) and will fail after removing the sidebar layout and theme components.
**How to avoid:** Remove or update these test files as part of the layout refactoring task. The middleware and auth-api tests should remain untouched.
**Warning signs:** CI/test failures after layout changes.

### Pitfall 2: Anchor Navigation Scroll Offset
**What goes wrong:** Clicking a bottom tab bar section link scrolls to the section, but the sticky top nav covers the section heading.
**How to avoid:** Add `scroll-margin-top` to each section to account for the top nav height:
```css
section[id] { scroll-margin-top: 4rem; /* match top nav height */ }
```
Or use Tailwind: `scroll-mt-16` on each section wrapper.

### Pitfall 3: Plaid Amount Sign Convention
**What goes wrong:** Displaying raw `amount` values shows positive numbers for spending which looks correct but leads to incorrect aggregation when refunds/income are mixed in.
**How to avoid:** Create `lib/plaid-amounts.ts` with clear utility functions BEFORE any component renders amounts. Document the convention in the file header.
**Reference:** See PITFALLS.md Pitfall 4 for full details.

### Pitfall 4: Service Role Key Exposure
**What goes wrong:** Supabase service_role key ends up in client bundle.
**How to avoid:** Only import from `lib/supabase/server.ts` in Server Components and API routes. Never use `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`. Verify after build that the key doesn't appear in `.next/static/`.
**Reference:** See PITFALLS.md Pitfall 3 for full details.

### Pitfall 5: Vercel Environment Variables Missing
**What goes wrong:** Deploy succeeds but app crashes because env vars are not configured in Vercel.
**How to avoid:** Configure these env vars in Vercel project settings BEFORE first deployment:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (needed for public metadata, even if not used yet)
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_PASSWORD`

### Pitfall 6: Mobile Bottom Tab Bar Overlapping Content
**What goes wrong:** Last section of the scrollable page is hidden behind the fixed bottom nav.
**How to avoid:** Already handled with `pb-20 md:pb-6` in current layout. Ensure the new single-page layout maintains adequate bottom padding on mobile.

## Code Examples

### Sign Out API Handler (add to existing route.ts)

```typescript
// app/api/auth/route.ts -- add this alongside existing POST
export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.set({
    name: "fintrack-session",
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  })
  return response
}
```

### Plaid Amount Utilities

```typescript
// lib/plaid-amounts.ts
/**
 * Plaid amount convention:
 * - POSITIVE = money leaving the account (spending, debits, payments)
 * - NEGATIVE = money entering the account (income, refunds, credits)
 *
 * This is counterintuitive. All display/aggregation logic MUST use
 * these utilities rather than raw amount values.
 */

export const isSpending = (amount: number): boolean => amount > 0
export const isIncome = (amount: number): boolean => amount < 0

/** Returns the absolute display value (always positive) */
export const displayAmount = (amount: number): number => Math.abs(amount)

/** Format as USD currency string: "$1,234.50" */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount))
}

/** Sum only spending transactions (positive amounts) */
export function totalSpending(amounts: number[]): number {
  return amounts.filter(a => a > 0).reduce((sum, a) => sum + a, 0)
}

/** Sum only income transactions (negative amounts, returned as positive) */
export function totalIncome(amounts: number[]): number {
  return amounts.filter(a => a < 0).reduce((sum, a) => sum + Math.abs(a), 0)
}
```

### Typed Query Example

```typescript
// lib/queries/accounts.ts
import { createServerSupabase } from "@/lib/supabase/server"
import type { Account } from "./types"

export async function getAccounts(): Promise<Account[]> {
  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .order("created_at", { ascending: true })

  if (error) throw new Error(`Failed to fetch accounts: ${error.message}`)
  return data as Account[]
}

export async function getAccountWithInstitution(accountId: string) {
  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from("accounts")
    .select("*, institutions(institution_name)")
    .eq("id", accountId)
    .single()

  if (error) throw new Error(`Failed to fetch account: ${error.message}`)
  return data
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| next-themes for dark mode | Hardcode `class="dark"` for single-theme apps | Always available | Removes ~5KB JS, no hydration flash |
| Sidebar nav in dashboards | Top nav + section scroll for single-page apps | Design preference | Simpler layout, no route transitions |
| @supabase/auth-helpers | @supabase/ssr (if using Supabase Auth) | 2024 | N/A for this project (password gate) |
| Tailwind v3 config files | Tailwind v4 CSS-first config (`@theme`) | 2025 | Already using v4, no `tailwind.config.js` needed |

## Open Questions

1. **Vercel Project Setup**
   - What we know: Vercel CLI or dashboard can create the project. Free tier has 10-second serverless timeout.
   - What's unclear: Whether Abhi has a Vercel account connected to this GitHub repo.
   - Recommendation: Plan includes a Vercel deployment task with both CLI and dashboard options.

2. **Existing Multi-Page Routes**
   - What we know: `/transactions`, `/recurring`, `/chat` routes exist as placeholder pages.
   - What's unclear: Whether to delete these routes now or leave them for potential future use.
   - Recommendation: Remove them in Phase 1 to avoid confusion. The single-page layout handles all sections. Chat drawer (Phase 4) doesn't need a separate route.

3. **Supabase Typed Client Generation**
   - What we know: Supabase CLI can generate TypeScript types from the database schema (`supabase gen types`).
   - What's unclear: Whether the Supabase CLI is installed and linked to the project.
   - Recommendation: For Phase 1, manually define types matching the migration SQL. This is simpler and avoids a CLI dependency. Can switch to generated types later.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 + @testing-library/react 16.3.2 |
| Config file | `fintrack-dashboard/vitest.config.ts` |
| Quick run command | `cd fintrack-dashboard && npm test` |
| Full suite command | `cd fintrack-dashboard && npm test` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUND-01 | Project initializes with correct stack | smoke | `cd fintrack-dashboard && npm run build` | N/A (build check) |
| FOUND-02 | Password login with 30-day cookie + sign out | unit | `cd fintrack-dashboard && npx vitest run src/__tests__/auth-api.test.ts` | Partial (auth-api exists, sign-out test needed) |
| FOUND-03 | No service_role key in browser | unit | `cd fintrack-dashboard && npx vitest run src/__tests__/supabase-security.test.ts` | No |
| FOUND-04 | Typed query layer + Plaid amount utils | unit | `cd fintrack-dashboard && npx vitest run src/__tests__/plaid-amounts.test.ts` | No |
| FOUND-05 | Dark theme, no theme toggle | unit | `cd fintrack-dashboard && npx vitest run src/__tests__/layout.test.tsx` | No |
| LAYO-01 | Top nav bar with logo + sign out | unit | `cd fintrack-dashboard && npx vitest run src/__tests__/top-nav.test.tsx` | No |
| LAYO-02 | Single column max-width container | unit | Covered by layout test | No |
| LAYO-03 | Mobile bottom tab bar with section jumps | unit | `cd fintrack-dashboard && npx vitest run src/__tests__/mobile-nav.test.tsx` | No |
| LAYO-04 | Deployed to Vercel | manual-only | Verify URL loads in browser | N/A |

### Sampling Rate

- **Per task commit:** `cd fintrack-dashboard && npm test`
- **Per wave merge:** `cd fintrack-dashboard && npm test && npm run build`
- **Phase gate:** Full suite green + successful Vercel deployment

### Wave 0 Gaps

- [ ] `src/__tests__/auth-api.test.ts` -- UPDATE: add sign-out (DELETE) tests
- [ ] `src/__tests__/plaid-amounts.test.ts` -- covers FOUND-04 (amount utilities)
- [ ] `src/__tests__/top-nav.test.tsx` -- covers LAYO-01 (top nav rendering)
- [ ] `src/__tests__/mobile-nav.test.tsx` -- UPDATE existing or create: anchor links instead of route links
- [ ] DELETE `src/__tests__/sidebar.test.tsx` -- sidebar being removed
- [ ] DELETE `src/__tests__/theme-toggle.test.tsx` -- theme toggle being removed

## Sources

### Primary (HIGH confidence)

- Existing codebase analysis -- `fintrack-dashboard/src/` fully reviewed
- `supabase-migration.sql` -- database schema (4 tables: institutions, accounts, transactions, sync_log)
- `.planning/research/STACK.md` -- stack decisions already researched and validated
- `.planning/research/PITFALLS.md` -- pitfalls already catalogued
- `.planning/PROJECT.md` -- project constraints and key decisions

### Secondary (MEDIUM confidence)

- Next.js App Router middleware docs -- cookie-based auth pattern
- Vercel deployment docs -- env var configuration, free tier limits

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages already installed and validated in STACK.md
- Architecture: HIGH -- requirements are clear, existing code provides solid baseline to refactor
- Pitfalls: HIGH -- well-documented in PITFALLS.md, most are for later phases (charts, streaming)
- Data layer: HIGH -- database schema known from migration SQL, Supabase client already configured

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (stable stack, no fast-moving dependencies in Phase 1)
