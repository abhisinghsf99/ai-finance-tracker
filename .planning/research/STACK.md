# Technology Stack

**Project:** FinTrack - Personal Finance Dashboard
**Researched:** 2026-03-10

## Current State

The project already has a Next.js 15 app (`fintrack-dashboard/`) with foundational dependencies installed. This research validates the existing choices and prescribes the remaining libraries needed.

### Already Installed (Validated)

| Technology | Version | Purpose | Status |
|------------|---------|---------|--------|
| Next.js | 15.5.12 | App framework (App Router + Turbopack) | Installed, correct |
| React | 19.1.0 | UI library | Installed, correct |
| TypeScript | ^5 | Type safety | Installed, correct |
| Tailwind CSS | ^4 | Utility-first styling | Installed, correct |
| shadcn/ui (via `shadcn` CLI) | ^4.0.3 | Component library | Installed, correct |
| @supabase/supabase-js | ^2.99.0 | Database client | Installed, correct |
| lucide-react | ^0.577.0 | Icons | Installed, correct |
| class-variance-authority | ^0.7.1 | Variant styling | Installed (shadcn dep) |
| clsx + tailwind-merge | latest | Class merging | Installed (shadcn dep) |
| Vitest | ^4.0.18 | Test runner | Installed, correct |
| @testing-library/react | ^16.3.2 | Component testing | Installed, correct |

## Recommended Stack (To Add)

### Charts - Recharts v3

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| recharts | ^3.8.0 | Bar charts, donut charts, area charts | shadcn/ui charts are built on Recharts. v3 is now officially supported by shadcn (PR #8486 merged). Composable API, no wrapper lock-in, financial chart patterns well-documented. |

**Confidence:** HIGH -- shadcn/ui officially upgraded to Recharts v3, version 3.8.0 confirmed on npm.

**React 19 Compatibility Warning:** Recharts v3 with React 19 has a known issue where charts render blank inside `ResponsiveContainer`. The fix is to override `react-is` to match your React 19 version. Add to `package.json`:

```json
{
  "overrides": {
    "react-is": "19.1.0"
  }
}
```

This is documented by shadcn/ui for React 19 setups. Without this override, charts will silently fail to render.

### AI Chat Interface - Vercel AI SDK

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| ai | ^6.0.116 | Core AI SDK (streamText, useChat) | Provides `useChat` hook for streaming chat UI, `streamText` for server-side streaming, and `experimental_createMCPClient` for connecting to your existing MCP server. Handles all the SSE/streaming complexity. |
| @ai-sdk/anthropic | ^3.0.58 | Anthropic provider for AI SDK | Connects AI SDK to Claude models. One-liner model config: `anthropic('claude-sonnet-4-5-20250929')`. |

**Confidence:** HIGH -- AI SDK v6 is stable (0.14.1+), actively maintained by Vercel, first-class Next.js integration.

**Why AI SDK over raw @anthropic-ai/sdk:** The raw Anthropic SDK (`@anthropic-ai/sdk@0.78.0`) gives you direct API access but you'd need to build: streaming response handling, chat state management, message history, SSE plumbing, and React hooks. The AI SDK provides all of this out of the box via `useChat` hook + `streamText` server function + built-in MCP client support. For a chat drawer UI, this saves weeks of work.

**MCP Integration:** Your existing MCP server at `claudefinancetracker.xyz/mcp` connects via `experimental_createMCPClient` with SSE transport. The `execute_query` and `get_schema` tools become available to Claude automatically -- no manual tool wiring needed.

### Supabase Server-Side Access

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @supabase/ssr | ^0.6.0 | Server-side Supabase client for App Router | Creates proper server/client Supabase instances for Next.js App Router. Handles cookie-based auth token refresh. Required for Server Components to access Supabase securely. |

**Confidence:** HIGH -- Official Supabase package, replaces deprecated @supabase/auth-helpers.

**Note:** You already have `@supabase/supabase-js` installed and a `src/lib/supabase/server.ts` file. You may already have this set up. However, since you're using a simple password gate (not Supabase Auth), you may only need `@supabase/supabase-js` with server-side route handlers. The `@supabase/ssr` package is primarily useful if you later adopt Supabase Auth. **For now, skip @supabase/ssr** -- your password gate + service_role key in API routes is simpler and sufficient for a single-user app.

### Fonts

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @fontsource/general-sans | latest | Neo-grotesque typography | Matches design direction (Satoshi/General Sans). Self-hosted via npm avoids Google Fonts latency. General Sans is freely available; Satoshi requires a license. |

**Confidence:** MEDIUM -- General Sans is available on Fontsource. If Satoshi is preferred, it needs to be loaded via `next/font/local` with the font files.

## Libraries to NOT Use

| Library | Why Not | Use Instead |
|---------|---------|-------------|
| @anthropic-ai/sdk (direct) | Requires building streaming, chat state, SSE plumbing manually | `ai` + `@ai-sdk/anthropic` |
| chart.js / react-chartjs-2 | Not integrated with shadcn/ui, imperative API, worse DX | `recharts` v3 |
| nivo | Over-engineered for this use case, large bundle | `recharts` v3 |
| @tanstack/react-query | Adds unnecessary complexity for read-only dashboard. Server Components fetch data directly. | Server Component `async/await` + Supabase queries |
| next-themes | Already installed but unnecessary -- project is dark-only | Remove it, hardcode dark theme in `layout.tsx` |
| @supabase/auth-helpers | Deprecated | `@supabase/ssr` (if needed) |
| framer-motion | Heavy for simple animations. Dashboard cards don't need physics-based animation. | CSS transitions + `tw-animate-css` (already installed) |
| zustand / jotai | No complex client state needed. Chat state handled by `useChat`. Dashboard data from server. | React context (if needed at all) |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not Alternative |
|----------|-------------|-------------|---------------------|
| Charts | Recharts v3 | Tremor | Tremor wraps Recharts but adds abstraction; shadcn already provides chart components on Recharts |
| Charts | Recharts v3 | Victory | Smaller community, less shadcn integration |
| AI Chat | AI SDK (Vercel) | Raw Anthropic SDK | 3-4x more code for same result; no `useChat` hook |
| AI Chat | AI SDK (Vercel) | LangChain.js | Overkill for a single-model chat with MCP; adds massive dependency |
| Icons | lucide-react | heroicons | Already installed, shadcn default, consistent design |
| Styling | Tailwind v4 | CSS Modules | Already committed to Tailwind via shadcn |

## Full Installation Command

```bash
# New dependencies to add
npm install recharts ai @ai-sdk/anthropic @ai-sdk/react

# Font (optional -- can also use next/font/google)
npm install @fontsource/general-sans
```

**Total new dependencies: 4 packages** (plus optional font). The stack is intentionally minimal.

## Environment Variables Required

```bash
# Already have (Supabase)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # Server-side only, never in browser

# Need to add
ANTHROPIC_API_KEY=                # For AI SDK Anthropic provider
FINTRACK_PASSWORD=                # For password gate auth
MCP_SERVER_URL=https://claudefinancetracker.xyz/mcp  # MCP server endpoint
```

## Architecture Implications

### Data Fetching Pattern
- **Dashboard data:** Server Components fetch from Supabase via `@supabase/supabase-js` using service_role key in server-only code. No client-side fetching for dashboard cards/charts.
- **Chat:** Client-side `useChat` hook posts to `/api/chat` route handler. Route handler uses AI SDK `streamText` + MCP client server-side only.
- **Auth:** Simple middleware check for session cookie. No Supabase Auth overhead.

### Bundle Considerations
- Recharts is ~200KB gzipped -- acceptable for a dashboard app, but lazy-load chart components behind Suspense boundaries
- AI SDK core is lightweight (~30KB); the Anthropic provider adds minimal overhead
- shadcn components are copy-pasted (not a runtime dependency), so zero unused component bloat

### Cleanup Recommended
- Remove `next-themes` dependency -- dark-only app doesn't need theme switching
- Remove `theme-provider.tsx` and `theme-toggle.tsx` -- per PROJECT.md, dark theme only
- The existing sidebar/navigation structure can stay as-is

## Version Pinning Strategy

Lock major versions in `package.json` to avoid breaking changes:
- `recharts`: Use `^3.8.0` (v3 is stable, minor updates safe)
- `ai`: Use `^6.0.0` (v6 is current major, follows semver)
- `@ai-sdk/anthropic`: Use `^3.0.0` (follows AI SDK versioning)

## Sources

- [recharts npm](https://www.npmjs.com/package/recharts) -- v3.8.0 confirmed
- [Recharts 3.0 migration guide](https://github.com/recharts/recharts/wiki/3.0-migration-guide) -- breaking changes reference
- [shadcn/ui Recharts v3 PR #8486](https://github.com/shadcn-ui/ui/pull/8486/files) -- official v3 support
- [shadcn/ui React 19 guide](https://ui.shadcn.com/docs/react-19) -- react-is override
- [AI SDK v6 docs](https://ai-sdk.dev/docs/introduction) -- current stable
- [AI SDK MCP tools](https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools) -- experimental_createMCPClient
- [AI SDK Getting Started (Next.js App Router)](https://ai-sdk.dev/docs/getting-started/nextjs-app-router) -- useChat + streamText pattern
- [@ai-sdk/anthropic npm](https://www.npmjs.com/package/@ai-sdk/anthropic) -- v3.0.58 confirmed
- [@anthropic-ai/sdk npm](https://www.npmjs.com/package/@anthropic-ai/sdk) -- v0.78.0 (not recommended for this project)
- [Supabase SSR docs](https://supabase.com/docs/guides/auth/server-side/creating-a-client) -- @supabase/ssr reference
- [Supabase Next.js quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs) -- data fetching patterns
- [Recharts React 19 rendering issue #6857](https://github.com/recharts/recharts/issues/6857) -- react-is fix
