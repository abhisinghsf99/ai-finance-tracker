# Architecture Research

**Domain:** Personal finance dashboard (Next.js App Router frontend on existing Supabase backend)
**Researched:** 2026-03-10
**Confidence:** HIGH

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    BROWSER (Single Page App)                     │
│                                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │ Summary      │ │ Account      │ │ Charts       │             │
│  │ Cards (SC)   │ │ Cards (SC)   │ │ (CC)         │             │
│  └──────────────┘ └──────────────┘ └──────────────┘             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │ Transactions │ │ Recurring    │ │ Chat Drawer  │             │
│  │ Panel (CC)   │ │ Panel (CC)   │ │ (CC)         │             │
│  └──────────────┘ └──────────────┘ └──────────────┘             │
│                                                                  │
│  SC = Server Component (data fetch at request time)              │
│  CC = Client Component (interactivity, state, user input)        │
├──────────────────────────────────────────────────────────────────┤
│                    NEXT.JS SERVER (Vercel)                        │
│                                                                  │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐     │
│  │ Server         │  │ API Route      │  │ API Route      │     │
│  │ Components     │  │ /api/chat      │  │ /api/auth      │     │
│  │ (data queries) │  │ (Anthropic+MCP)│  │ (password gate)│     │
│  └───────┬────────┘  └───────┬────────┘  └────────────────┘     │
│          │                   │                                   │
│  ┌───────┴────────┐  ┌──────┴─────────┐                        │
│  │ Data Queries   │  │ Anthropic SDK  │                         │
│  │ Layer          │  │ + MCP Client   │                         │
│  │ (lib/queries/) │  │ (lib/chat/)    │                         │
│  └───────┬────────┘  └──────┬─────────┘                        │
├──────────┴───────────────────┴──────────────────────────────────┤
│                    EXTERNAL SERVICES                             │
│                                                                  │
│  ┌────────────────┐  ┌─────────────────────────────────────┐    │
│  │ Supabase       │  │ MCP Server                          │    │
│  │ (Postgres)     │  │ claudefinancetracker.xyz/mcp         │    │
│  │ service_role   │  │ execute_query + get_schema           │    │
│  └────────────────┘  └─────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────┐                                             │
│  │ Plaid Webhook  │ (writes to Supabase, not touched by FE)    │
│  │ → VPS          │                                             │
│  └────────────────┘                                             │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| **Summary Cards** | Current/last month spending, % change, transaction count | Server Component. Runs aggregate SQL at request time. Pure display, no interactivity. |
| **Account Cards** | Balance display, net position, credit utilization bars | Server Component. Fetches accounts table. Utilization bar is CSS-only (no JS needed). |
| **Monthly Trend Chart** | Bar chart of trailing 6 months spending | Client Component wrapping Recharts. Data passed from server parent via props. |
| **Category Donut Chart** | Spending by category with drill-down | Client Component wrapping Recharts. Drill-down state requires client interactivity. |
| **Transactions Panel** | Collapsible list with search/filter | Client Component. Search/filter are client-side interactions on server-fetched data. |
| **Recurring Panel** | Auto-detected recurring charges | Client Component (collapsible). Data computed server-side, interactivity client-side. |
| **Chat Drawer** | Floating button + sliding drawer, message history | Client Component. Streams responses from /api/chat. Fully client-side state. |
| **Data Queries Layer** | Typed Supabase queries, aggregation logic | Server-only module (lib/queries/). Never imported in client components. |
| **Chat API Route** | Anthropic SDK + MCP client orchestration | Route Handler at /api/chat. Streams responses. Holds API keys server-side. |
| **Auth Middleware** | Cookie-based session check | Next.js middleware (already built). Redirects unauthenticated requests. |

## Recommended Project Structure

```
src/
├── app/
│   ├── (app)/
│   │   ├── layout.tsx              # Sidebar + mobile nav (exists)
│   │   ├── page.tsx                # Dashboard page (server component, composes sections)
│   │   ├── transactions/
│   │   │   └── page.tsx            # Full transactions view
│   │   ├── recurring/
│   │   │   └── page.tsx            # Full recurring view
│   │   └── chat/
│   │       └── page.tsx            # Full-page chat (optional, drawer is primary)
│   ├── api/
│   │   ├── auth/
│   │   │   └── route.ts            # Password auth (exists)
│   │   └── chat/
│   │       └── route.ts            # Anthropic + MCP streaming endpoint
│   ├── login/
│   │   └── page.tsx                # Login page (exists)
│   └── layout.tsx                  # Root layout (exists)
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx             # (exists)
│   │   ├── mobile-nav.tsx          # (exists)
│   │   └── theme-toggle.tsx        # (exists)
│   ├── dashboard/
│   │   ├── summary-cards.tsx       # Server component — aggregate stats
│   │   ├── account-cards.tsx       # Server component — balance display
│   │   ├── monthly-trend.tsx       # Client component — Recharts bar chart
│   │   ├── category-breakdown.tsx  # Client component — Recharts donut
│   │   ├── transactions-panel.tsx  # Client component — collapsible + search
│   │   └── recurring-panel.tsx     # Client component — collapsible list
│   ├── chat/
│   │   ├── chat-drawer.tsx         # Client component — floating button + sheet
│   │   ├── chat-messages.tsx       # Client component — message list
│   │   └── chat-input.tsx          # Client component — input + send
│   └── ui/                         # shadcn components (exists)
├── lib/
│   ├── supabase/
│   │   └── server.ts               # Supabase client factory (exists)
│   ├── queries/
│   │   ├── accounts.ts             # getAccounts, getNetPosition
│   │   ├── transactions.ts         # getRecentTransactions, searchTransactions
│   │   ├── spending.ts             # getMonthlySpending, getCategoryBreakdown
│   │   ├── recurring.ts            # detectRecurringCharges
│   │   └── summary.ts              # getCurrentMonthSpending, getSpendingChange
│   ├── chat/
│   │   └── client.ts               # Anthropic SDK + MCP client setup
│   ├── formatters.ts               # Currency, date, percentage formatting
│   └── utils.ts                    # (exists)
├── types/
│   └── database.ts                 # TypeScript types matching Supabase schema
└── __tests__/                      # (exists)
```

### Structure Rationale

- **`lib/queries/`:** All Supabase queries isolated in one place. Server Components import from here. If a query changes, only the query file changes, not the component. This also enforces that `service_role` key usage stays server-side since these files are never imported with `"use client"`.
- **`components/dashboard/`:** Each dashboard section is a self-contained component. Server components (summary, accounts) fetch their own data. Client components (charts, panels) receive data as props from the page-level server component.
- **`components/chat/`:** Chat is a separate concern from dashboard visualization. The drawer pattern means it overlays on any page, so it lives in the app layout, not in any specific page.
- **`types/database.ts`:** Single source of truth for TypeScript types. Mirror the Supabase schema. Avoids `any` creeping in through query results.

## Architectural Patterns

### Pattern 1: Server Component Data Fetching with Client Component Islands

**What:** The dashboard page (`page.tsx`) is a server component that fetches all data, then passes it as props to client component children that handle interactivity (charts, collapsibles, search).

**When to use:** Any section that needs both data and interactivity. This is the primary pattern for the entire dashboard.

**Trade-offs:** Simple mental model, no client-side data fetching needed, but means a full page refresh is needed to get fresh data. Acceptable for a personal finance dashboard where data changes daily, not in real-time.

**Example:**
```typescript
// app/(app)/page.tsx — Server Component
import { getMonthlySpending } from "@/lib/queries/spending"
import { getAccounts } from "@/lib/queries/accounts"
import { MonthlyTrend } from "@/components/dashboard/monthly-trend"
import { SummaryCards } from "@/components/dashboard/summary-cards"

export default async function DashboardPage() {
  const [monthlySpending, accounts] = await Promise.all([
    getMonthlySpending(6),
    getAccounts(),
  ])

  return (
    <div className="space-y-6">
      {/* Server component — renders its own data */}
      <SummaryCards />

      {/* Client component — receives data as props */}
      <MonthlyTrend data={monthlySpending} />
    </div>
  )
}
```

```typescript
// components/dashboard/monthly-trend.tsx — Client Component
"use client"

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

interface MonthlyTrendProps {
  data: { month: string; total: number }[]
}

export function MonthlyTrend({ data }: MonthlyTrendProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="total" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

### Pattern 2: Typed Query Layer

**What:** Every Supabase query lives in `lib/queries/` as a typed async function. Each function returns a typed result, not raw Supabase responses. The query layer handles the `service_role` client creation, error handling, and data transformation.

**When to use:** Every data access. No component should directly call `supabase.from(...)`.

**Trade-offs:** Adds a thin layer of indirection, but prevents security mistakes (no client-side service_role usage), enables easy testing/mocking, and keeps components focused on rendering.

**Example:**
```typescript
// lib/queries/spending.ts
import { createServerSupabase } from "@/lib/supabase/server"

export interface MonthlySpending {
  month: string
  total: number
}

export async function getMonthlySpending(months: number = 6): Promise<MonthlySpending[]> {
  const supabase = createServerSupabase()

  const { data, error } = await supabase
    .from("transactions")
    .select("amount, date")
    .gte("date", getMonthsAgoDate(months))
    .eq("is_pending", false)

  if (error) throw new Error(`Failed to fetch spending: ${error.message}`)

  // Aggregate by month in JS (simpler than SQL for 6 months of data)
  return aggregateByMonth(data)
}
```

### Pattern 3: Streaming Chat via Route Handler

**What:** The `/api/chat` route handler accepts messages, calls the Anthropic API with MCP tool use, and streams the response back using the Web Streams API. The client component consumes this stream incrementally.

**When to use:** The chat drawer feature. This is the only feature that requires streaming and the Anthropic SDK.

**Trade-offs:** Streaming adds complexity but provides the responsive feel users expect from chat. The MCP integration means Claude can query the database directly, which is powerful but means the chat route is the most complex piece of the system.

**Example:**
```typescript
// app/api/chat/route.ts
import Anthropic from "@anthropic-ai/sdk"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"

export async function POST(request: Request) {
  const { messages } = await request.json()
  const anthropic = new Anthropic()

  // Connect to MCP server for tool definitions
  const mcpClient = new Client({ name: "fintrack-chat" })
  // ... connect to remote MCP server

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages,
    tools: mcpTools,
  })

  // Return streaming response
  return new Response(stream.toReadableStream(), {
    headers: { "Content-Type": "text/event-stream" },
  })
}
```

### Pattern 4: Collapsible Sections with URL State (optional)

**What:** Transactions and Recurring panels are collapsible. Use a simple client-side `useState` for expand/collapse. Search/filter state stays local to the component.

**When to use:** Panels that show lists of items with search/filter capabilities.

**Trade-offs:** Keeping state client-side means it resets on page reload, but this is fine for a personal dashboard. No need for URL-based state management for a single-page app.

## Data Flow

### Dashboard Data Flow (Primary)

```
[Page Load / Navigation]
    │
    ▼
[Server Component: page.tsx]
    │
    ├─── Promise.all([...queries])
    │         │
    │         ▼
    │    [lib/queries/*] ──► [Supabase (service_role)] ──► [Postgres]
    │         │
    │         ▼
    │    [Typed results]
    │
    ├─── Render server components inline (SummaryCards, AccountCards)
    │
    └─── Pass data as props to client components
              │
              ▼
         [Client Components: Charts, Panels]
              │
              ▼
         [Recharts renders, user interacts]
              │
              ▼
         [Local state for filters, drill-down, collapse]
```

### Chat Data Flow

```
[User types message in ChatDrawer]
    │
    ▼
[Client: POST /api/chat with messages array]
    │
    ▼
[Route Handler: /api/chat]
    │
    ├─── [Anthropic SDK: create message with tools]
    │         │
    │         ▼
    │    [Claude decides to use execute_query tool]
    │         │
    │         ▼
    │    [MCP Client → Remote MCP Server → Supabase]
    │         │
    │         ▼
    │    [Query results returned to Claude]
    │         │
    │         ▼
    │    [Claude formulates response]
    │
    ▼
[Streamed response back to client]
    │
    ▼
[ChatDrawer updates message list incrementally]
```

### Auth Flow (Already Built)

```
[Any request] → [Middleware checks fintrack-session cookie]
    │                    │
    ├── Has cookie ──► [Allow through]
    │
    └── No cookie ──► [Redirect to /login]
                           │
                           ▼
                      [User enters password]
                           │
                           ▼
                      [POST /api/auth → validates → sets cookie (30 days)]
                           │
                           ▼
                      [Redirect to /]
```

### Key Data Flows

1. **Dashboard load:** Single request triggers parallel Supabase queries via server components. All data is fetched server-side, rendered as HTML, and hydrated with client interactivity where needed. No client-side fetch calls for dashboard data.

2. **Chat interaction:** Client sends message history to `/api/chat`. The route handler orchestrates Anthropic + MCP tool calls server-side. Response streams back. The MCP server handles its own Supabase connection independently of the dashboard data layer.

3. **Data freshness:** Dashboard data is fresh on every page load (server component re-renders). No caching layer needed initially. Plaid syncs happen via webhook on the VPS, so the Supabase data updates independently of the frontend.

## Anti-Patterns

### Anti-Pattern 1: Client-Side Supabase Queries

**What people do:** Import `createClient` in client components, use `NEXT_PUBLIC_SUPABASE_ANON_KEY` to query directly from the browser.

**Why it's wrong:** RLS policies block anon access to all tables (by design). Using service_role key in the browser exposes full database access. There is no safe way to query from the client with this RLS configuration.

**Do this instead:** All Supabase queries go through server components or route handlers. The `lib/queries/` layer enforces this boundary. Client components receive data as props, never fetch it.

### Anti-Pattern 2: One Giant Client Component

**What people do:** Mark the entire dashboard page as `"use client"` so they can use `useState` for collapsibles and charts, then use `useEffect` to fetch data.

**Why it's wrong:** Loses server-side rendering benefits, ships unnecessary JS to the client, creates loading spinners everywhere, and means the service_role key can't be used (it would leak to the browser).

**Do this instead:** Keep the page as a server component. Only the interactive pieces (charts, collapsibles, chat) are client components. Data flows down via props.

### Anti-Pattern 3: Fetching Data Per-Component

**What people do:** Each dashboard section independently fetches its own data using `useEffect` or separate server component data calls, leading to waterfall requests.

**Why it's wrong:** Creates N sequential or poorly-coordinated requests. The page loads in stages with content popping in, which looks unprofessional.

**Do this instead:** The page-level server component runs `Promise.all()` to fetch all data in parallel, then distributes it. One round-trip, all sections render together. For sections that are themselves server components (SummaryCards, AccountCards), Next.js automatically parallelizes their data fetching when they're siblings.

### Anti-Pattern 4: Putting MCP Client Logic in Client Components

**What people do:** Try to connect to the MCP server directly from the browser.

**Why it's wrong:** The MCP server uses service_role credentials, and browser CORS restrictions will block the connection anyway. The MCP SDK is also a Node.js library.

**Do this instead:** All MCP interaction goes through the `/api/chat` route handler. The client component only knows about the chat API endpoint.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **Supabase** | `supabase-js` with `service_role` key, server-side only | Already configured in `lib/supabase/server.ts`. All reads go through the typed query layer. |
| **Anthropic API** | `@anthropic-ai/sdk` in route handler, streaming | Not yet installed. Add to dependencies. Used only in `/api/chat`. |
| **MCP Server** | `@modelcontextprotocol/sdk` client in route handler | Remote server at `claudefinancetracker.xyz/mcp`. Stateless connection per chat request. |
| **Plaid** | None from frontend | Webhook receiver on VPS writes to Supabase. Frontend is read-only. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **Page → Query Layer** | Direct function import | Server-only. `lib/queries/` returns typed data. |
| **Page → Client Components** | Props (serializable data) | Data crosses the server/client boundary via React props. Must be JSON-serializable. |
| **Chat Drawer → Chat API** | HTTP POST + streaming response | Client component fetches `/api/chat`. No shared state with dashboard. |
| **Chat API → MCP Server** | MCP protocol over HTTP | Route handler creates ephemeral MCP client connection per request. |
| **Middleware → Auth API** | Cookie-based | Middleware reads cookie, auth API sets cookie. No shared state. |

## Build Order (Dependencies)

The following order respects component dependencies:

1. **Types + Query Layer** (no dependencies)
   - `types/database.ts` — TypeScript types for all tables
   - `lib/queries/*` — All Supabase query functions
   - `lib/formatters.ts` — Currency/date formatting utilities
   - *Rationale:* Everything else depends on having typed data access.

2. **Summary + Account Cards** (depends on: query layer)
   - Server components that fetch and display data
   - No client-side interactivity needed
   - *Rationale:* Simplest components. Validates the query layer works end-to-end.

3. **Charts** (depends on: query layer)
   - Install Recharts
   - Monthly trend bar chart
   - Category breakdown donut chart
   - *Rationale:* Client components, but data comes from server parent. Drill-down interactivity is self-contained.

4. **Collapsible Panels** (depends on: query layer)
   - Transactions panel with search/filter
   - Recurring charges panel with auto-detection
   - *Rationale:* More complex client components with local state. The recurring detection query is the most complex query to write.

5. **Chat System** (independent of dashboard components)
   - Install Anthropic SDK + MCP SDK
   - `/api/chat` route handler with streaming
   - Chat drawer UI (floating button + sheet)
   - *Rationale:* Fully independent system. Can be built in parallel with dashboard components if desired, but has higher complexity and risk.

6. **Polish + Mobile** (depends on: all above)
   - Mobile bottom tab bar for section jumps (scrolling within single page)
   - Loading states (replace skeletons with real Suspense boundaries)
   - Error boundaries per section
   - *Rationale:* Polish layer. Requires all sections to exist first.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Personal use (1 user) | Current architecture is ideal. Server components, no caching, fresh data on every load. |
| Household (2-5 users) | Add Supabase Auth, update RLS policies with `user_id` column, add `anon` key policies. Architecture stays the same. |
| Multi-user SaaS | Out of scope per PROJECT.md. Would need client-side auth, per-user data isolation, caching layer, connection pooling. |

### Scaling Priorities (within personal use)

1. **First bottleneck:** Transaction volume. After connecting 5+ institutions, the transactions table will grow. Add date-range limits to all queries (already indexed). Paginate transaction lists.
2. **Second bottleneck:** Chat response time. MCP round-trips add latency. Consider caching MCP schema calls (it rarely changes).

## Sources

- Next.js App Router documentation (server/client component model, route handlers, streaming)
- Existing codebase analysis (middleware, auth, layout, sidebar, Supabase client)
- Supabase migration SQL (table structure, RLS policies, indexes)
- MCP server source code (tools.js — execute_query, get_schema patterns)
- PROJECT.md (requirements, constraints, design direction)

---
*Architecture research for: FinTrack personal finance dashboard*
*Researched: 2026-03-10*
