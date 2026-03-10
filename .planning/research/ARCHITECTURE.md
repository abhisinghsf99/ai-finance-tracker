# Architecture Patterns

**Domain:** Personal fintech dashboard (Next.js frontend for existing Supabase + Plaid backend)
**Researched:** 2026-03-10

## Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  BROWSER (Client Components)                                        │
│  ┌──────────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │ Dashboard Charts  │  │ Tx Filters   │  │ Chat UI (streaming)   │ │
│  │ Theme Toggle      │  │ Search Input │  │ Message bubbles       │ │
│  └────────┬─────────┘  └──────┬───────┘  └───────────┬───────────┘ │
│           │                    │                       │             │
│  ┌────────▼────────────────────▼──┐         ┌─────────▼───────────┐ │
│  │ Supabase Browser Client        │         │ fetch('/api/chat')  │ │
│  │ (@supabase/ssr createBrowser)  │         │ ReadableStream      │ │
│  └────────┬───────────────────────┘         └─────────┬───────────┘ │
└───────────┼───────────────────────────────────────────┼─────────────┘
            │ anon key (RLS-gated SELECTs)              │ POST
            │                                           │
┌───────────┼───────────────────────────────────────────┼─────────────┐
│  VERCEL (Server)                                      │             │
│           │                                  ┌────────▼──────────┐  │
│  ┌────────▼────────────────────┐             │ /api/chat         │  │
│  │ Server Components (RSC)     │             │ Route Handler     │  │
│  │ - page.tsx data loading     │             │ Anthropic SDK     │  │
│  │ - Suspense boundaries       │             │ + mcp_servers     │  │
│  │ - Supabase Server Client    │             │ → stream back     │  │
│  │   (service_role key)        │             └────────┬──────────┘  │
│  └────────┬────────────────────┘                      │             │
└───────────┼───────────────────────────────────────────┼─────────────┘
            │ service_role (full access)                 │ MCP protocol
            ▼                                           ▼
┌────────────────────────┐              ┌────────────────────────────┐
│  Supabase (Postgres)   │              │  Remote MCP Server         │
│  institutions          │              │  claudefinancetracker.xyz   │
│  accounts              │◄────────────│  /mcp                      │
│  transactions          │  SQL via RPC │  (get_schema,              │
│  sync_log              │              │   execute_query)            │
└────────────────────────┘              └────────────────────────────┘
```

### Decision: Server-Side Supabase with service_role Key

Use Next.js Server Components with the `service_role` key through `@supabase/ssr` `createServerClient`, NOT the browser anon key. This is the right call because:

1. **RLS is currently service_role-only.** The existing RLS policies block the anon role entirely. Adding anon SELECT policies weakens security for minimal benefit.
2. **Single-user app.** There is no multi-user auth context where RLS user-scoping matters. The auth gate protects the entire app, not individual rows.
3. **Server Components run on Vercel's servers.** The service_role key never reaches the browser. Data fetches happen server-side and render as HTML.
4. **Simpler.** No RLS policy migration needed. No risk of accidentally exposing financial data through a misconfigured anon policy.

The browser client (`createBrowserClient`) is only needed if client components need real-time subscriptions or interactive filtering that fetches on keystrokes. For this app, server components handle initial data loads and client components handle UI state only.

### Component Boundaries

| Component | Responsibility | Communicates With | Runs On |
|-----------|---------------|-------------------|---------|
| **Layout Shell** | Sidebar nav, theme provider, auth gate wrapper | All pages | Server + Client |
| **Auth Middleware** | Block unauthenticated requests, validate session cookie | Every route | Edge (middleware.ts) |
| **Dashboard Page** | Fetch summary stats, account balances, recent transactions; render charts | Supabase (server-side) | Server Component |
| **Dashboard Charts** | Interactive Recharts rendering (tooltips, hover states) | Receives data as props from server parent | Client Component |
| **Transactions Page** | Fetch full transaction list with server-side pagination | Supabase (server-side) | Server Component |
| **Transaction Filters** | Search input, category/account dropdowns, date range picker | Updates URL search params (triggers server re-fetch) | Client Component |
| **Recurring Page** | Aggregate query for recurring merchant detection | Supabase (server-side) | Server Component |
| **Chat Page** | Chat UI shell, message history state, streaming display | /api/chat route handler | Client Component |
| **Chat API Route** | Anthropic SDK with mcp_servers parameter, streaming response | Anthropic API, Remote MCP server | Route Handler (server) |
| **Supabase Server Util** | Create authenticated server client for RSC/Route Handlers | Supabase | Utility (lib/) |
| **Theme Provider** | Dark/light toggle, localStorage persistence, CSS class on html | None external | Client Component |

### Data Flow

**Flow 1: Dashboard Page Load**
```
1. User navigates to /
2. middleware.ts checks session cookie → allow or redirect to /login
3. Server Component page.tsx executes:
   a. createServerClient(supabaseUrl, serviceRoleKey)
   b. Parallel queries:
      - SELECT accounts with balances (JOIN institutions)
      - SELECT SUM(amount), category_primary FROM transactions WHERE date >= month_start GROUP BY category
      - SELECT SUM(amount) FROM transactions WHERE date >= month_start (current month total)
      - SELECT SUM(amount) FROM transactions WHERE date in previous month (comparison)
      - SELECT * FROM transactions ORDER BY date DESC LIMIT 15 (recent)
      - SELECT date_trunc('month', date), SUM(amount) FROM transactions GROUP BY 1 ORDER BY 1 DESC LIMIT 6
4. Server Component renders static HTML with data
5. Client Components hydrate for interactivity (chart tooltips, theme toggle)
```

**Flow 2: Transaction Filtering**
```
1. User types in search box or selects filter
2. Client Component updates URL search params: /transactions?search=Amazon&category=FOOD_AND_DRINK
3. Next.js App Router re-renders the Server Component with new searchParams
4. Server Component queries Supabase with WHERE clauses matching params
5. Fresh HTML streamed to client via React Server Components
```
This pattern uses URL-driven state. No client-side state management library needed. The URL IS the state.

**Flow 3: Chat Conversation**
```
1. User types message in chat input (Client Component)
2. Client POSTs to /api/chat with { messages: [...history, newMessage] }
3. Route Handler creates Anthropic client:
   - Uses mcp_servers parameter with remote MCP URL
   - System prompt includes financial assistant persona + Plaid amount conventions
   - Streams response back via ReadableStream
4. Anthropic API connects to MCP server, calls get_schema then execute_query
5. Claude generates conversational response from query results
6. Stream chunks arrive at client, rendered incrementally in chat bubble
```

**Flow 4: Auth (Middleware-Based Password Gate)**
```
1. User visits any route
2. middleware.ts runs on Edge:
   a. Check for session cookie (e.g., "fintrack-session")
   b. If valid → pass through
   c. If missing/invalid → redirect to /login
3. /login page shows password input
4. User submits password
5. /api/auth Route Handler:
   a. Compare against AUTH_PASSWORD env var (bcrypt hash comparison)
   b. If match → set HttpOnly, Secure, SameSite=Strict cookie with signed token
   c. If no match → return 401
6. Client redirects to / on success
```

## Patterns to Follow

### Pattern 1: Server Component Data Loading with Parallel Queries

**What:** Fetch all data needed for a page in the Server Component using Promise.all, then pass results as props to Client Components that handle interactivity.

**When:** Every page that displays Supabase data (Dashboard, Transactions, Recurring).

**Why:** Server Components have zero client-side JavaScript cost. Parallel queries reduce waterfall. Data never leaves the server until it is rendered HTML.

```typescript
// app/page.tsx (Server Component)
import { createServerSupabase } from '@/lib/supabase/server'
import { DashboardCharts } from '@/components/dashboard-charts'
import { AccountCards } from '@/components/account-cards'

export default async function DashboardPage() {
  const supabase = createServerSupabase()
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().split('T')[0]

  const [accounts, categorySpend, recentTx] = await Promise.all([
    supabase
      .from('accounts')
      .select('*, institutions(institution_name)')
      .order('type'),
    supabase
      .from('transactions')
      .select('category_primary, amount')
      .gte('date', monthStart)
      .gt('amount', 0),
    supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })
      .limit(15),
  ])

  return (
    <>
      <AccountCards accounts={accounts.data ?? []} />
      <DashboardCharts categoryData={categorySpend.data ?? []} />
      <RecentTransactions transactions={recentTx.data ?? []} />
    </>
  )
}
```

### Pattern 2: URL-Driven Filtering (No Client State Library)

**What:** Use URL search params as the single source of truth for filters. Client Components update the URL; Server Components read searchParams and query accordingly.

**When:** Transactions page filters, any filterable list.

**Why:** Shareable URLs, browser back/forward works, no state management library needed, server-side filtering is more efficient than client-side.

```typescript
// app/transactions/page.tsx (Server Component)
export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: { search?: string; category?: string; page?: string }
}) {
  const supabase = createServerSupabase()
  const page = parseInt(searchParams.page ?? '1')
  const perPage = 50

  let query = supabase
    .from('transactions')
    .select('*, accounts(name, mask)', { count: 'exact' })
    .order('date', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1)

  if (searchParams.search) {
    query = query.ilike('merchant_name', `%${searchParams.search}%`)
  }
  if (searchParams.category) {
    query = query.eq('category_primary', searchParams.category)
  }

  const { data, count } = await query
  // render with pagination controls
}
```

### Pattern 3: Streaming Chat via Route Handler

**What:** Use the Anthropic SDK's `mcp_servers` parameter to let Claude connect to the remote MCP server directly. Stream the response back to the client using a ReadableStream.

**When:** /api/chat route handler.

**Why:** The `mcp_servers` parameter offloads MCP connection management to Anthropic's infrastructure. No need to run an MCP client in the Next.js server. Streaming gives instant feedback to the user.

```typescript
// app/api/chat/route.ts
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  const { messages } = await req.json()

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: `You are a personal financial assistant. You have access to a database...
      IMPORTANT: In the Plaid convention, positive amounts = spending, negative = income/refunds.`,
    messages,
    // MCP connector — Anthropic connects to the remote MCP server server-side
    mcp_servers: [{
      type: 'url',
      url: process.env.MCP_SERVER_URL!,
      name: 'financial-db',
    }],
  })

  // Convert Anthropic's stream to a web-standard ReadableStream
  const readable = new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta') {
          controller.enqueue(new TextEncoder().encode(event.delta.text))
        }
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
```

**Confidence note (MEDIUM):** The `mcp_servers` parameter for the Messages API is available as of late 2025. The exact parameter shape may have evolved. Verify against current Anthropic API docs before implementation. If `mcp_servers` is unavailable or requires a beta header, the fallback is to use the MCP SDK's `Client` class with `StreamableHTTPClientTransport` to connect to the remote MCP server from the Route Handler, then pass tools via `mcpTools()` helper.

### Pattern 4: Supabase Client Factory

**What:** Create utility functions that instantiate the correct Supabase client for server vs. client contexts.

**When:** Every file that touches Supabase.

```typescript
// lib/supabase/server.ts
import { createClient } from '@supabase/supabase-js'

export function createServerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
```

No `@supabase/ssr` or cookie handling needed. This is a single-user app with no Supabase Auth — the auth gate is a simple password. The server client uses the service_role key directly. No browser client is needed unless real-time subscriptions are added later.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Client-Side Data Fetching with useEffect

**What:** Fetching Supabase data in Client Components with useEffect + useState.

**Why bad:** Exposes the Supabase key to the browser (even anon key is unnecessary exposure for financial data). Creates loading spinners instead of server-rendered content. Doubles the JavaScript bundle with data fetching logic. Hurts SEO (irrelevant here but bad habit).

**Instead:** Server Components fetch data and pass it as props to Client Components. Client Components only handle interactivity (chart hover, filter UI, theme toggle).

### Anti-Pattern 2: Global State Management Library for Dashboard Data

**What:** Using Redux, Zustand, or Jotai to store dashboard data fetched from Supabase.

**Why bad:** Adds complexity for zero benefit when Server Components already provide the data. URL search params handle filter state. Only the chat page has meaningful client-side state (message history), and that is local to the chat component.

**Instead:** Server Components for data. URL params for filters. Local component state (useState) for chat messages and UI toggles.

### Anti-Pattern 3: Building an MCP Client in Next.js

**What:** Using `@modelcontextprotocol/sdk` Client in the Route Handler to manually connect to the remote MCP server, list tools, and pass them to Anthropic.

**Why bad:** Adds MCP SDK dependency, session management complexity, connection lifecycle management, and error handling that Anthropic's `mcp_servers` parameter handles automatically.

**Instead:** Use the `mcp_servers` parameter on the Messages API. Anthropic's infrastructure handles the MCP connection. If this parameter is unavailable, the MCP SDK client approach is the correct fallback (see Pattern 3 confidence note).

### Anti-Pattern 4: Exposing service_role Key to Client Components

**What:** Using `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` or passing the service role key to any client-side code.

**Why bad:** The service_role key bypasses ALL RLS. Anyone with browser dev tools could read, modify, or delete all financial data.

**Instead:** Service_role key only in server-side code (Server Components, Route Handlers, Server Actions). The key is in `SUPABASE_SERVICE_ROLE_KEY` (no `NEXT_PUBLIC_` prefix), so Next.js automatically excludes it from the client bundle.

## File Structure

```
app/
├── layout.tsx              # Root layout: sidebar, theme provider, auth check
├── page.tsx                # Dashboard (Server Component)
├── transactions/
│   └── page.tsx            # Transaction list (Server Component with searchParams)
├── recurring/
│   └── page.tsx            # Recurring charges (Server Component)
├── chat/
│   └── page.tsx            # Chat UI (Client Component)
├── login/
│   └── page.tsx            # Password input (Client Component)
├── api/
│   ├── chat/
│   │   └── route.ts        # Anthropic SDK + MCP streaming
│   └── auth/
│       └── route.ts        # Password verification, cookie setting
├── globals.css             # Tailwind + theme variables
components/
├── layout/
│   ├── sidebar.tsx         # Navigation sidebar
│   └── theme-toggle.tsx    # Dark/light switch (Client Component)
├── dashboard/
│   ├── summary-cards.tsx   # Spending totals (Server Component)
│   ├── account-cards.tsx   # Balance display (Server Component)
│   ├── spending-chart.tsx  # Recharts bar chart (Client Component)
│   ├── category-chart.tsx  # Recharts donut (Client Component)
│   └── recent-tx.tsx       # Recent transaction list (Server Component)
├── transactions/
│   ├── tx-table.tsx        # Transaction table rows (Server Component)
│   ├── tx-filters.tsx      # Search + filter controls (Client Component)
│   └── pagination.tsx      # Page navigation (Client Component)
├── recurring/
│   └── recurring-list.tsx  # Recurring charge cards (Server Component)
├── chat/
│   ├── chat-messages.tsx   # Message display (Client Component)
│   ├── chat-input.tsx      # Input + send (Client Component)
│   └── suggestion-chips.tsx # Empty state prompts (Client Component)
└── ui/                     # shadcn/ui components (Button, Card, Input, etc.)
lib/
├── supabase/
│   └── server.ts           # createServerSupabase() factory
├── queries/
│   ├── dashboard.ts        # Dashboard-specific query functions
│   ├── transactions.ts     # Transaction queries with filter params
│   └── recurring.ts        # Recurring detection query
├── utils/
│   ├── format.ts           # Currency formatting, date formatting
│   └── categories.ts       # Category label/color mapping
└── types/
    └── database.ts         # TypeScript types matching Supabase schema
middleware.ts               # Auth check on every request
```

## Suggested Build Order

Dependencies flow top-to-bottom. Each step produces something testable.

```
1. Project init + Supabase server client
   ↓ (everything depends on this)
2. Auth middleware + login page
   ↓ (must be in place before deploying)
3. Layout shell (sidebar + theme)
   ↓ (all pages render inside this)
4. Dashboard page (server queries + static rendering)
   ↓ (proves data flows correctly)
5. Dashboard charts (Client Components with Recharts)
   ↓ (adds interactivity to working page)
6. Transactions page (server queries + URL-driven filters)
   ↓ (reuses query patterns from dashboard)
7. Recurring page (aggregation query)
   ↓ (standalone, no dependencies on 5-6)
8. Chat API route (/api/chat with Anthropic + MCP)
   ↓ (can test with curl before building UI)
9. Chat UI (Client Component with streaming)
   ↓ (depends on working API route)
10. Deploy to Vercel
```

**Why this order:**
- Steps 1-3 are foundational: cannot build pages without a working client, auth, and layout.
- Step 4 (Dashboard) before Step 6 (Transactions) because dashboard has the most complex queries and proves the data access pattern works.
- Step 5 (Charts) is separated from Step 4 because Recharts adds a new dependency and Client Component boundary -- cleaner to verify data rendering first, then add interactivity.
- Steps 8-9 (Chat) are last because they depend on the Anthropic SDK and have the most external dependencies. The /api/chat route can be tested independently with curl.
- Step 2 (Auth) is early because the app exposes real financial data. Even during development, the auth gate should be in place before any Vercel deployment.

## Scalability Considerations

| Concern | Current (1 user, 5 accounts) | If data grows (5+ institutions, 50K+ transactions) |
|---------|------|------|
| **Query speed** | Direct Supabase queries, sub-100ms | Add database indexes on date+category combos; consider materialized views for monthly aggregations |
| **Page load** | Server Component rendering, no client fetch waterfall | Add Suspense boundaries to stream data progressively |
| **Chat latency** | Anthropic API + MCP roundtrip, 2-5s typical | Stream response to show text incrementally; no architecture change needed |
| **Bundle size** | shadcn/ui + Recharts + Tailwind, ~150KB gzipped | Already code-split per page via App Router; Recharts only loads on dashboard/recurring |
| **Vercel limits** | Free tier: 100GB bandwidth, 10s function timeout | Chat streaming may hit 10s timeout on complex queries; upgrade to Pro or use Edge runtime for streaming |

## Sources

- [Supabase SSR client docs](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase Next.js quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Anthropic TypeScript SDK](https://github.com/anthropics/anthropic-sdk-typescript)
- [MCP connector docs](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector)
- [Next.js App Router authentication](https://nextjs.org/learn/dashboard-app/adding-authentication)
- [Vercel basic auth template](https://vercel.com/templates/next.js/basic-auth-password)
- [Vercel AI SDK Anthropic provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic)

---

*Architecture research: 2026-03-10*
