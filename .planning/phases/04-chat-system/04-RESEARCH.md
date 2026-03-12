# Phase 4: Chat System - Research

**Researched:** 2026-03-11
**Domain:** AI Chat UI + Vercel AI SDK + MCP Integration
**Confidence:** HIGH

## Summary

Phase 4 builds a floating chat button that expands to a full-screen chat view, powered by Claude via the Vercel AI SDK and a remote MCP server. The MCP server at `claudefinancetracker.xyz/mcp` already exists with `execute_query` and `get_schema` tools using Streamable HTTP transport. The AI SDK (v6) provides stable MCP client support via `@ai-sdk/mcp` with `createMCPClient`, and the `useChat` hook + `streamText` handle the full streaming lifecycle from API route to React UI.

The critical architectural decision is using the Vercel AI SDK (`ai` + `@ai-sdk/mcp` + `@ai-sdk/anthropic`) rather than the raw `@anthropic-ai/sdk`. The AI SDK provides `useChat` for client state, `streamText` for server streaming, and native MCP tool integration -- eliminating manual stream parsing, tool call loops, and message format conversion. For Vercel Hobby plan, Fluid Compute provides 300-second function duration by default, so the 10-second legacy limit does not apply. Setting `maxDuration = 300` in the route file is sufficient.

**Primary recommendation:** Use `ai@6` + `@ai-sdk/mcp` + `@ai-sdk/anthropic` with `useChat`/`streamText` pattern. Connect to the remote MCP server via `StreamableHTTPClientTransport`. Render markdown responses with `react-markdown` + `remark-gfm` for table support.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Persistent FAB** bottom-right on all screens (desktop and mobile), teal/cyan accent, MessageSquare icon
- Tapping FAB expands to **full-screen chat view** (not side sheet or floating panel)
- Full-screen takeover: dashboard top nav and mobile bottom nav are **fully hidden**
- Chat has its own header with back button and title
- Mobile: both FAB and existing #chat bottom nav tab open the same full-screen chat
- **Fresh each time** -- closing chat clears conversation entirely (React state only, no persistence)
- **4 suggestion chips** on empty state, disappear after first message
- **Factual, not conversational** responses -- TL;DR first, then detailed breakdown with markdown tables
- **Streaming responses** with typing indicator during MCP tool calls
- **New chat button** in header for mid-conversation reset

### Claude's Discretion
- FAB animation/transition when expanding to full-screen
- Chat header exact design (back button style, title text)
- Typing indicator animation style
- Specific suggestion chip text (4 casual financial questions)
- Message bubble styling (user vs assistant visual distinction)
- Error state design (API failures, timeout handling)
- Input bar design (placeholder text, send button style)
- System prompt engineering for factual, structured responses
- How to handle Vercel Hobby plan timeout constraint

### Deferred Ideas (OUT OF SCOPE)
- Search history-based suggestion chips (v2, requires conversation persistence)
- Conversation history persistence to Supabase (future milestone)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CHAT-01 | Floating chat button (bottom-right) opens a chat drawer/modal | FAB component using Button + MessageSquare icon, fixed positioning, onClick triggers full-screen chat overlay |
| CHAT-02 | Chat message area with user/assistant bubbles and loading indicator | `useChat` hook provides `messages` array with `parts`; render with role-based styling; typing indicator via `status` from useChat |
| CHAT-03 | Suggestion chips for common queries on empty state | Static array of 4 chip strings, rendered when messages.length === 0, clicking a chip calls `sendMessage` |
| CHAT-04 | /api/chat route calls Anthropic API with MCP server for SQL queries | `streamText` + `@ai-sdk/anthropic` model + `createMCPClient` with StreamableHTTPClientTransport to claudefinancetracker.xyz/mcp |
| CHAT-05 | Claude generates SQL via execute_query tool and returns conversational response | MCP tools auto-discovered via `mcpClient.tools()`, multi-step enabled with `stopWhen: stepCountIs(3)`, system prompt enforces factual markdown format |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ai` | ^6.0.116 | Core AI SDK -- streamText, convertToModelMessages, UIMessage types | Official Vercel AI SDK, handles streaming protocol, message format, tool call lifecycle |
| `@ai-sdk/react` | latest (v6 compat) | useChat hook for React client state | Official React bindings, manages message array, input state, loading status, streaming |
| `@ai-sdk/anthropic` | ^3.0.58 | Claude model provider for AI SDK | Official Anthropic provider, works with streamText out of the box |
| `@ai-sdk/mcp` | ^1.0.25 | createMCPClient for connecting to MCP servers | Official MCP integration, bridges MCP tools to AI SDK tool format |
| `@modelcontextprotocol/sdk` | ^1.12.1 | StreamableHTTPClientTransport for remote MCP connection | Official MCP TypeScript SDK, required for HTTP transport to remote server |
| `react-markdown` | ^9.x | Render markdown in chat bubbles | De facto standard for React markdown rendering, safe by default |
| `remark-gfm` | ^4.x | GitHub Flavored Markdown plugin (tables, strikethrough) | Required for rendering transaction tables in responses |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | already installed (via MCP SDK dep) | Schema validation for tool inputs | Only if defining explicit tool schemas (not needed with auto-discovery) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vercel AI SDK | @anthropic-ai/sdk directly | Loses useChat hook, must hand-roll streaming protocol, message format conversion, tool call loops |
| react-markdown | dangerouslySetInnerHTML | XSS risk, no React virtual DOM diffing |
| Full-screen overlay | shadcn Sheet | CONTEXT.md specifies full-screen takeover, Sheet is a side panel |

**Installation:**
```bash
cd fintrack-dashboard
npm install ai @ai-sdk/react @ai-sdk/anthropic @ai-sdk/mcp @modelcontextprotocol/sdk react-markdown remark-gfm
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/api/chat/
│   └── route.ts              # POST handler: streamText + MCP client
├── components/chat/
│   ├── chat-fab.tsx           # Floating action button (client component)
│   ├── chat-view.tsx          # Full-screen chat overlay (client component)
│   ├── chat-message.tsx       # Single message bubble with markdown rendering
│   ├── chat-input.tsx         # Input bar with send button
│   ├── suggestion-chips.tsx   # Empty state chips
│   └── typing-indicator.tsx   # Animated dots indicator
├── lib/
│   └── chat-config.ts        # System prompt, suggestion chip text, constants
```

### Pattern 1: API Route with MCP Client (Per-Request Lifecycle)
**What:** Create MCP client per request, get tools, call streamText, close client on finish.
**When to use:** Every chat API request.
**Example:**
```typescript
// src/app/api/chat/route.ts
import { streamText, convertToModelMessages, UIMessage, stepCountIs } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { createMCPClient } from '@ai-sdk/mcp';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SYSTEM_PROMPT } from '@/lib/chat-config';

export const maxDuration = 300; // Vercel Hobby max

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const mcpClient = await createMCPClient({
    transport: new StreamableHTTPClientTransport(
      new URL('https://claudefinancetracker.xyz/mcp')
    ),
  });

  const tools = await mcpClient.tools();

  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(3),
    onFinish: async () => {
      await mcpClient.close();
    },
  });

  return result.toUIMessageStreamResponse();
}
```

### Pattern 2: useChat Client Hook
**What:** Use `useChat` from `@ai-sdk/react` for all client-side chat state management.
**When to use:** The chat view component.
**Example:**
```typescript
// src/components/chat/chat-view.tsx
'use client';

import { useChat } from '@ai-sdk/react';
import { ChatMessage } from './chat-message';
import { ChatInput } from './chat-input';
import { SuggestionChips } from './suggestion-chips';
import { TypingIndicator } from './typing-indicator';

export function ChatView({ onClose }: { onClose: () => void }) {
  const { messages, sendMessage, status, setMessages } = useChat();

  const isLoading = status === 'streaming' || status === 'submitted';
  const isEmpty = messages.length === 0;

  const handleNewChat = () => setMessages([]);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header with back button + new chat */}
      {/* Messages area */}
      {isEmpty && <SuggestionChips onSelect={(text) => sendMessage({ parts: [{ type: 'text', text }] })} />}
      {messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)}
      {isLoading && <TypingIndicator />}
      {/* Input bar */}
      <ChatInput onSend={(text) => sendMessage({ parts: [{ type: 'text', text }] })} disabled={isLoading} />
    </div>
  );
}
```

### Pattern 3: Markdown Message Rendering
**What:** Render assistant messages as markdown with table support.
**When to use:** Every assistant message bubble.
**Example:**
```typescript
// src/components/chat/chat-message.tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function ChatMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
        isUser
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted'
      }`}>
        {message.parts.map((part, i) => {
          if (part.type === 'text') {
            return isUser ? (
              <p key={i}>{part.text}</p>
            ) : (
              <ReactMarkdown
                key={i}
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-2">
                      <table className="w-full text-sm border-collapse">{children}</table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="border-b border-border px-3 py-1.5 text-left font-medium">{children}</th>
                  ),
                  td: ({ children }) => (
                    <td className="border-b border-border/50 px-3 py-1.5">{children}</td>
                  ),
                }}
              >
                {part.text}
              </ReactMarkdown>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Creating MCP client at module level:** MCP sessions are stateful and per-request. Creating at module level causes session reuse/conflict across requests.
- **Not closing MCP client:** Leaks sessions on the remote MCP server. Always close in `onFinish`.
- **Using dangerouslySetInnerHTML for markdown:** XSS risk. Use react-markdown.
- **Storing chat messages in localStorage/state outside component:** CONTEXT.md specifies fresh conversation on every open. Do not persist.
- **Using Edge Runtime:** Edge runtime cannot use `@modelcontextprotocol/sdk` (relies on Node.js APIs). Use default Node.js runtime with Fluid Compute.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Streaming chat protocol | Custom SSE parsing + ReadableStream wiring | `useChat` + `streamText` + `toUIMessageStreamResponse()` | AI SDK handles the full stream lifecycle, reconnection, message format |
| MCP tool call loop | Manual JSON-RPC calls to MCP server + tool result feeding | `createMCPClient` + `mcpClient.tools()` + `stopWhen: stepCountIs(N)` | AI SDK handles init, tool discovery, multi-step tool calls automatically |
| Chat message state management | Custom useState + fetch + stream parsing | `useChat` hook | Handles messages array, loading state, error state, streaming updates |
| Markdown rendering | Regex-based HTML conversion | `react-markdown` + `remark-gfm` | Handles edge cases, XSS-safe, supports GFM tables |
| MCP session management | Manual session ID tracking + JSON-RPC protocol | `StreamableHTTPClientTransport` | Handles session init, keep-alive, proper shutdown |

**Key insight:** The Vercel AI SDK v6 abstracts away 90% of the complexity. The entire chat feature is essentially: one API route (~30 lines), one client component with `useChat`, and styling. Do not reinvent the streaming or MCP protocol handling.

## Common Pitfalls

### Pitfall 1: MCP Client Lifecycle in Serverless
**What goes wrong:** MCP client created at module scope persists across invocations in warm serverless functions, causing stale/broken sessions.
**Why it happens:** Vercel reuses function instances (warm starts). Module-level state carries over.
**How to avoid:** Create MCP client inside the request handler. Close in `onFinish` callback.
**Warning signs:** "Bad Request: no valid session ID" errors after the first request works.

### Pitfall 2: Forgetting maxDuration on API Route
**What goes wrong:** Function times out at default 10 seconds (legacy) before Claude finishes tool calls.
**Why it happens:** Without explicit `maxDuration`, Vercel may apply legacy limits.
**How to avoid:** Export `maxDuration = 300` at the top of the route file.
**Warning signs:** "FUNCTION_INVOCATION_TIMEOUT" in Vercel logs.

### Pitfall 3: Edge Runtime Incompatibility
**What goes wrong:** `@modelcontextprotocol/sdk` fails at import time on Edge.
**Why it happens:** MCP SDK uses Node.js APIs (crypto, net) not available in Edge runtime.
**How to avoid:** Do NOT add `export const runtime = 'edge'`. Use default Node.js runtime with Fluid Compute.
**Warning signs:** Build errors about missing Node.js modules.

### Pitfall 4: react-markdown Performance with Streaming
**What goes wrong:** Re-rendering markdown on every token causes visible lag.
**Why it happens:** react-markdown parses the full markdown string on each render during streaming.
**How to avoid:** Use `React.memo` on the message component. Consider memoizing only the final message (the one being streamed). For typical financial responses (a few paragraphs + table), performance is acceptable.
**Warning signs:** Visible UI jank during streaming, especially with tables.

### Pitfall 5: System Prompt Not Enforcing Response Format
**What goes wrong:** Claude returns chatty prose instead of TL;DR + table format.
**Why it happens:** Without explicit system prompt instructions, Claude defaults to conversational style.
**How to avoid:** Detailed system prompt specifying: (1) always start with 2-3 sentence summary, (2) use markdown tables for transaction lists, (3) show individual transactions not categories, (4) classify transaction types.
**Warning signs:** Responses that don't match the CONTEXT.md response format specification.

### Pitfall 6: MCP Server get_schema Called Every Request
**What goes wrong:** Claude calls get_schema on every chat message, adding 1-2 seconds overhead.
**Why it happens:** Without schema context in the system prompt, Claude needs to discover the schema each time.
**How to avoid:** Include a condensed version of the database schema directly in the system prompt so Claude can write SQL immediately. The MCP get_schema tool remains available as fallback.
**Warning signs:** First response always takes 4-6 seconds extra.

## Code Examples

### System Prompt Configuration
```typescript
// src/lib/chat-config.ts
export const SYSTEM_PROMPT = `You are a financial assistant for FinTrack. You help users understand their personal finances by querying their transaction database.

## Response Format
1. Always start with a TL;DR: 2-3 sentence summary with key numbers (count, total amount, key insight)
2. Then provide a detailed breakdown using a markdown table when showing transactions
3. Table columns: Date | Vendor | Amount | Account

## Rules
- Be factual and direct, not conversational
- Show individual transactions, never summarize into categories unless explicitly asked
- Classify transactions intelligently: deposits, payments, Zelle transfers, account transfers, purchases
- Use the execute_query tool to run SQL queries against the database
- Always include a LIMIT clause (max 50 rows) to keep responses manageable
- Format currency amounts with $ and 2 decimal places

## Database Schema (condensed)
- transactions: id, account_id, amount (negative=debit, positive=credit), date, merchant_name, category, pending
- accounts: id, name, official_name, type (depository/credit/loan), subtype, balance_current, balance_available, balance_limit, institution_id, mask
- institutions: id, name
- Foreign keys: transactions.account_id -> accounts.id, accounts.institution_id -> institutions.id

## Amount Convention
Plaid amounts: positive = money leaving account (debits/spending), negative = money entering (credits/deposits).
In the database these are stored as-is. When displaying to users, show debits as positive spending amounts and credits as deposits.`;

export const SUGGESTION_CHIPS = [
  "How much did I spend this month?",
  "What are my biggest expenses lately?",
  "Show me my recent Zelle transfers",
  "Which subscriptions am I paying for?",
];
```

### FAB Component
```typescript
// src/components/chat/chat-fab.tsx
'use client';

import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatView } from './chat-view';

export function ChatFAB() {
  const [isOpen, setIsOpen] = useState(false);

  if (isOpen) {
    return <ChatView onClose={() => setIsOpen(false)} />;
  }

  return (
    <Button
      onClick={() => setIsOpen(true)}
      className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
      size="icon"
      aria-label="Open chat"
    >
      <MessageSquare className="h-6 w-6" />
    </Button>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `experimental_createMCPClient` | `createMCPClient` (stable in @ai-sdk/mcp) | AI SDK v6 (2025) | MCP support is now production-ready, not experimental |
| SSE transport for MCP | Streamable HTTP transport | MCP protocol 2025-03-26 | SSE deprecated; use StreamableHTTPClientTransport |
| `maxSteps` parameter | `stopWhen: stepCountIs(N)` | AI SDK v6 | More flexible loop control for multi-step tool calls |
| `handleSubmit` + `input` from useChat | `sendMessage` with parts | AI SDK v6 | New message format supports multi-part messages |
| Vercel 10s serverless timeout | Fluid Compute 300s default | 2025 | Hobby plan now gets 5-minute function duration |

**Deprecated/outdated:**
- `experimental_createMCPClient`: Renamed to `createMCPClient` in @ai-sdk/mcp
- `maxSteps`: Replaced by `stopWhen: stepCountIs(N)` in AI SDK v6
- SSE transport: Deprecated in MCP protocol 2025-03-26 in favor of Streamable HTTP
- `handleSubmit`/`input` from useChat: v6 uses `sendMessage` with parts-based messages

## Open Questions

1. **MCP Client Connection Latency**
   - What we know: Each request creates a new MCP session (init handshake + tool discovery). This adds ~500ms-1s overhead.
   - What's unclear: Whether connection pooling or session reuse is safe in serverless.
   - Recommendation: Accept per-request overhead for v1. It's a few hundred ms on top of 2-5s SQL queries. Optimize later if needed.

2. **Anthropic API Key Management**
   - What we know: `@ai-sdk/anthropic` reads `ANTHROPIC_API_KEY` from environment by default.
   - What's unclear: Whether there's already an Anthropic API key configured in Vercel.
   - Recommendation: Add `ANTHROPIC_API_KEY` to Vercel environment variables. The AI SDK auto-reads it.

3. **react-markdown Bundle Size**
   - What we know: react-markdown + remark-gfm adds ~30-40KB gzipped.
   - What's unclear: Impact on initial page load since chat is lazy-loaded.
   - Recommendation: Dynamic import the ChatView component with `next/dynamic` and `ssr: false` (established pattern from Phase 2).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.x + @testing-library/react |
| Config file | fintrack-dashboard/vitest.config.ts |
| Quick run command | `cd fintrack-dashboard && npx vitest run --reporter=verbose` |
| Full suite command | `cd fintrack-dashboard && npx vitest run --reporter=verbose` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHAT-01 | FAB renders on dashboard, opens chat on click | unit | `cd fintrack-dashboard && npx vitest run src/__tests__/chat-fab.test.tsx -x` | No -- Wave 0 |
| CHAT-02 | Message bubbles render user/assistant roles, loading indicator shows | unit | `cd fintrack-dashboard && npx vitest run src/__tests__/chat-message.test.tsx -x` | No -- Wave 0 |
| CHAT-03 | Suggestion chips render on empty state, disappear after send | unit | `cd fintrack-dashboard && npx vitest run src/__tests__/suggestion-chips.test.tsx -x` | No -- Wave 0 |
| CHAT-04 | API route returns streaming response with correct headers | unit | `cd fintrack-dashboard && npx vitest run src/__tests__/chat-api.test.ts -x` | No -- Wave 0 |
| CHAT-05 | System prompt produces factual markdown format | manual-only | N/A -- requires live Anthropic API + MCP server | N/A |

### Sampling Rate
- **Per task commit:** `cd fintrack-dashboard && npx vitest run --reporter=verbose`
- **Per wave merge:** `cd fintrack-dashboard && npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/chat-fab.test.tsx` -- covers CHAT-01 (FAB render + click to open)
- [ ] `src/__tests__/chat-message.test.tsx` -- covers CHAT-02 (message bubble rendering)
- [ ] `src/__tests__/suggestion-chips.test.tsx` -- covers CHAT-03 (chips display + hide)
- [ ] `src/__tests__/chat-api.test.ts` -- covers CHAT-04 (API route structure, mocked MCP)

## Sources

### Primary (HIGH confidence)
- [ai-sdk.dev/docs/ai-sdk-core/mcp-tools](https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools) -- MCP client setup, StreamableHTTPClientTransport, tool discovery, lifecycle
- [ai-sdk.dev/docs/getting-started/nextjs-app-router](https://ai-sdk.dev/docs/getting-started/nextjs-app-router) -- useChat + streamText pattern, API route setup
- [ai-sdk.dev/cookbook/next/call-tools-multiple-steps](https://ai-sdk.dev/cookbook/next/call-tools-multiple-steps) -- stopWhen: stepCountIs() for multi-step tool calls
- [ai-sdk.dev/docs/troubleshooting/timeout-on-vercel](https://ai-sdk.dev/docs/troubleshooting/timeout-on-vercel) -- maxDuration, Fluid Compute 300s on Hobby
- [npmjs.com/package/@ai-sdk/mcp](https://www.npmjs.com/package/@ai-sdk/mcp) -- v1.0.25 (stable, not experimental)
- [npmjs.com/package/ai](https://www.npmjs.com/package/ai) -- v6.0.116
- [npmjs.com/package/@ai-sdk/anthropic](https://www.npmjs.com/package/@ai-sdk/anthropic) -- v3.0.58

### Secondary (MEDIUM confidence)
- [vercel.com/docs/functions/limitations](https://vercel.com/docs/functions/limitations) -- Vercel function limits, Fluid Compute details
- [github.com/remarkjs/react-markdown](https://github.com/remarkjs/react-markdown) -- react-markdown capabilities, remark-gfm plugin
- [vercel.com/blog/ai-sdk-6](https://vercel.com/blog/ai-sdk-6) -- AI SDK v6 release, stable MCP support

### Tertiary (LOW confidence)
- MCP client per-request latency estimate (~500ms-1s) -- based on general HTTP handshake knowledge, not measured

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- verified via official AI SDK docs and npm package pages
- Architecture: HIGH -- patterns directly from official AI SDK Next.js examples
- Pitfalls: MEDIUM -- some based on general serverless knowledge, MCP lifecycle from docs
- Vercel timeout: HIGH -- verified via official Vercel docs (Fluid Compute 300s on Hobby)

**Research date:** 2026-03-11
**Valid until:** 2026-04-11 (AI SDK v6 is stable; MCP protocol is standardized)
