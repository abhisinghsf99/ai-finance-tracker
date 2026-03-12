---
phase: 04-chat-system
plan: 01
subsystem: api, chat
tags: [ai-sdk, anthropic, mcp, streaming, react-markdown, remark-gfm, claude]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Next.js app structure, API route pattern, TypeScript config
provides:
  - POST /api/chat streaming endpoint with MCP integration
  - SYSTEM_PROMPT with embedded schema and format rules
  - SUGGESTION_CHIPS array for empty state
  - ChatMessage component with markdown table rendering
affects: [04-02-chat-ui]

# Tech tracking
tech-stack:
  added: [ai@6, @ai-sdk/react, @ai-sdk/anthropic, @ai-sdk/mcp, @modelcontextprotocol/sdk, react-markdown, remark-gfm]
  patterns: [per-request MCP client lifecycle, streamText + toUIMessageStreamResponse, React.memo for streaming perf]

key-files:
  created:
    - fintrack-dashboard/src/app/api/chat/route.ts
    - fintrack-dashboard/src/lib/chat-config.ts
    - fintrack-dashboard/src/components/chat/chat-message.tsx
  modified:
    - fintrack-dashboard/package.json

key-decisions:
  - "Used --legacy-peer-deps for AI SDK install due to React 19.1.0 peer dep mismatch"

patterns-established:
  - "Per-request MCP client: create inside handler, close in onFinish"
  - "React.memo on streaming message components for performance"
  - "System prompt with embedded DB schema to avoid get_schema on every request"

requirements-completed: [CHAT-04, CHAT-05]

# Metrics
duration: 2min
completed: 2026-03-12
---

# Phase 4 Plan 1: Chat API & Message Component Summary

**Streaming chat API route with Claude + MCP integration, system prompt with embedded schema, and markdown message renderer with GFM table support**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-12T01:02:55Z
- **Completed:** 2026-03-12T01:04:26Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Installed all AI SDK dependencies (ai, @ai-sdk/react, @ai-sdk/anthropic, @ai-sdk/mcp, @modelcontextprotocol/sdk, react-markdown, remark-gfm)
- Created streaming POST /api/chat endpoint with per-request MCP client connecting to claudefinancetracker.xyz/mcp
- Created system prompt enforcing TL;DR + markdown table format with embedded database schema
- Built ChatMessage component with ReactMarkdown + remark-gfm for table rendering, React.memo for streaming perf

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and create chat config** - `0668211` (feat)
2. **Task 2: Create chat API route and message component** - `8f1e818` (feat)

## Files Created/Modified
- `fintrack-dashboard/src/lib/chat-config.ts` - SYSTEM_PROMPT with schema/format rules and SUGGESTION_CHIPS array
- `fintrack-dashboard/src/app/api/chat/route.ts` - Streaming POST handler with MCP client + Claude sonnet
- `fintrack-dashboard/src/components/chat/chat-message.tsx` - Message bubble with markdown rendering and table support
- `fintrack-dashboard/package.json` - Added 7 AI SDK and markdown dependencies

## Decisions Made
- Used --legacy-peer-deps for npm install: @ai-sdk/react expects specific React 19 peer versions, React 19.1.0 not in accepted range. Functionally compatible.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] npm peer dependency conflict with React 19.1.0**
- **Found during:** Task 1 (dependency installation)
- **Issue:** @ai-sdk/react peer dep requires ^18 || ~19.0.1 || ~19.1.2 || ^19.2.1, project uses 19.1.0
- **Fix:** Used --legacy-peer-deps flag to bypass strict resolution
- **Files modified:** package.json, package-lock.json
- **Verification:** All packages installed successfully, TypeScript compiles clean
- **Committed in:** 0668211 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for installation to proceed. No scope creep.

## Issues Encountered
- Pre-existing TypeScript errors in test files (screen, fireEvent imports from @testing-library/react) -- out of scope, not caused by this plan's changes.

## User Setup Required

**External services require manual configuration:**
- **ANTHROPIC_API_KEY** environment variable must be set in Vercel Dashboard (Anthropic Console -> API Keys -> Create key)
- The @ai-sdk/anthropic provider reads this automatically from env

## Next Phase Readiness
- Chat API route ready for consumption by chat UI (04-02)
- ChatMessage component ready for integration into ChatView
- SYSTEM_PROMPT and SUGGESTION_CHIPS exported for use in UI components

---
*Phase: 04-chat-system*
*Completed: 2026-03-12*
