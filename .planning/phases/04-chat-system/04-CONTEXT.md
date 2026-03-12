# Phase 4: Chat System - Context

**Gathered:** 2026-03-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a floating chat interface powered by Claude + MCP for natural language financial queries. A persistent FAB expands to a full-screen chat view with streaming responses, suggestion chips, and factual data-rich answers. The MCP server (claudefinancetracker.xyz/mcp) already exists with execute_query and get_schema tools. No new dashboard sections or navigation changes.

</domain>

<decisions>
## Implementation Decisions

### Chat drawer UX
- **Persistent floating action button (FAB)** bottom-right on all screens (desktop and mobile)
- Chat bubble icon (MessageSquare from Lucide), teal/cyan accent color
- Tapping FAB expands to **full-screen chat view** — not a side sheet or floating panel
- Full-screen takeover: dashboard top nav and mobile bottom nav are **fully hidden**
- Chat has its own header with back button (← Back) and title
- Mobile: both FAB and existing #chat bottom nav tab open the same full-screen chat

### Conversation behavior
- **Fresh each time** — closing the chat clears the conversation entirely
- No persistence to database or localStorage — React state only, cleared on close
- No message limit — user can chat as long as the tab is open
- Clean slate on every open — suggestion chips and empty state shown fresh
- **New chat button** in the header for resetting mid-conversation

### Suggestion chips & empty state
- **4 suggestion chips** on empty state
- Chips are Claude-recommended **casual questions** (e.g., "How much did I spend this month?")
- Future v2: chips could pull from search history, but v1 uses static Claude-picked defaults
- Chips **disappear after the first message** is sent
- Empty state: **centered greeting** ("Ask me anything about your finances") + chips below it

### Response formatting
- **Factual, not conversational** — direct answers, not chatty prose
- **TL;DR first**: Every response starts with 2-3 sentence summary (count + total, key insight)
- **Then detailed breakdown**: list individual transactions with date, vendor, amount, account
- **Table format** for transaction lists (Date | Vendor | Amount | Account columns)
- **Markdown rendering** in chat bubbles — bold, tables, bullet lists
- Claude should be **smart about transaction classification**: identify deposits, account payments, transactions, Zelle payments, account transfers, etc.
- Claude should **NOT generalize into categories** when asked for transaction lists — show each transaction individually
- **Streaming responses** — tokens appear word-by-word as generated
- **Typing indicator** (animated dots) while Claude is querying via MCP (2-5 second SQL queries)

### Claude's Discretion
- FAB animation/transition when expanding to full-screen
- Chat header exact design (back button style, title text)
- Typing indicator animation style
- Specific suggestion chip text (4 casual financial questions)
- Message bubble styling (user vs assistant visual distinction)
- Error state design (API failures, timeout handling)
- Input bar design (placeholder text, send button style)
- System prompt engineering for factual, structured responses
- How to handle Vercel Hobby plan 10-second timeout constraint

</decisions>

<specifics>
## Specific Ideas

- Response pattern example: "You had 12 grocery transactions totaling $487.32 in March." followed by a markdown table with Date | Vendor | Amount | Account
- Claude should classify transaction types intelligently (deposits, payments, Zelle, transfers) rather than treating everything as generic spending
- The chat should feel like querying a smart financial assistant, not a generic chatbot
- Suggestion chips tone: casual questions like "How much did I spend this month?" not commands like "Show spending summary"

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Sheet` component (shadcn/ui): exists but NOT used — full-screen approach instead
- `Button` component: for FAB and send button
- `Input` component: for chat input bar
- `Skeleton` component: for loading states
- `formatCurrency()` from plaid-amounts.ts: amount formatting in responses
- `MessageSquare` icon from lucide-react: already used in mobile nav for Chat tab
- Mobile nav already has `#chat` tab wired up

### Established Patterns
- Server components for data fetching, client components for interactivity
- Only one API route exists (`/api/auth/route.ts`) — chat route will be second
- `force-dynamic` export pattern on dashboard page
- Dynamic imports with ssr: false for heavy client components

### Integration Points
- `page.tsx` has `#chat` section placeholder — replace "Coming in Phase 4" with FAB component
- MobileNav `#chat` tab needs to trigger the same full-screen chat as the FAB
- MCP server at claudefinancetracker.xyz/mcp — authless, execute_query + get_schema tools
- No AI SDK dependencies installed yet — need @anthropic-ai/sdk or Vercel AI SDK

</code_context>

<deferred>
## Deferred Ideas

- Search history-based suggestion chips — v2 feature, requires conversation persistence
- Conversation history persistence to Supabase — noted for future milestone

</deferred>

---

*Phase: 04-chat-system*
*Context gathered: 2026-03-11*
