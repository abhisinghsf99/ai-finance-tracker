# Technology Stack

**Project:** FinTrack Frontend Dashboard
**Researched:** 2026-03-10
**Overall confidence:** HIGH

## Decision: Next.js 15 (not 14, not 16)

The PROJECT.md says "Next.js 14" but that is now two major versions behind. Next.js 16.1 is current (Dec 2025), and Next.js 14 is nearing end-of-life. However, Next.js 16 has breaking changes (async request APIs fully enforced, middleware renamed to proxy, React 19.2 canary) that add migration risk with less community battle-testing.

**Recommendation: Next.js 15.5.x** -- the sweet spot. It is stable, production-proven, has React 19 support (needed for shadcn/ui latest), Turbopack stable for dev, and broad ecosystem compatibility. Upgrading from 15 to 16 later is straightforward once 16 matures.

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js | 15.5.x | Full-stack React framework | Vercel-native deployment, App Router with RSC, API routes for chat backend. v15 is stable and battle-tested. v14 is too old (React 18 only), v16 is too fresh (breaking changes still settling). | HIGH |
| React | 19.x | UI library | Required by Next.js 15. shadcn/ui is fully compatible with React 19. | HIGH |
| TypeScript | 5.x | Type safety | Non-negotiable for financial data handling. Catches amount/sign errors at compile time. | HIGH |

### UI & Styling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Tailwind CSS | 4.x | Utility-first CSS | shadcn/ui dependency. Tailwind 4 is current and stable. | HIGH |
| shadcn/ui | latest (CLI v4) | Component library | Not a package -- copy-paste components you own. Accessible, Tailwind-native, dark mode built-in. The new CLI v4 (March 2026) uses a single `radix-ui` dependency instead of multiple `@radix-ui/react-*` packages. | HIGH |
| Recharts | 3.8.x | Charts and data viz | shadcn/ui's built-in Chart component wraps Recharts. Using Recharts directly means you get shadcn chart components for free (area, bar, line, pie -- 53 chart variants with automatic dark/light mode). No reason to add a second charting library. | HIGH |
| lucide-react | latest | Icons | shadcn/ui default icon library. Consistent with the component system. | HIGH |

### Database & Backend Services

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @supabase/supabase-js | 2.x | Supabase client | Already using Supabase for the backend. v2 is the stable release with full TypeScript support. | HIGH |
| @supabase/ssr | 0.9.x | Server-side Supabase client | Required for Next.js App Router. Creates proper server/browser clients, handles cookie-based sessions. Replaces deprecated @supabase/auth-helpers-nextjs. | HIGH |

### AI Chat

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| ai (Vercel AI SDK) | 6.x | Chat streaming infrastructure | Use this INSTEAD of direct @anthropic-ai/sdk. The `useChat` hook eliminates ~60% of chat UI boilerplate: streaming state, message history, abort handling, error recovery. The `streamText()` server helper handles SSE formatting. Direct Anthropic SDK would require building all of this manually. | HIGH |
| @ai-sdk/anthropic | latest | Anthropic provider for AI SDK | Connects AI SDK to Claude. One-line provider swap if you ever want to test other models. | HIGH |

**Important architecture note for chat:** The existing MCP server at claudefinancetracker.xyz/mcp is a remote MCP server. The AI SDK 6 supports MCP natively -- you can connect to the remote MCP server from your API route and Claude will call the MCP tools (execute_query, get_schema) automatically. This is cleaner than manually wiring tool calls with the raw Anthropic SDK.

### Auth (Simple Gate)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js Middleware | built-in | Password gate | For a single-user personal app, a full auth system (NextAuth, Clerk, Supabase Auth) is overkill. Use Next.js middleware with a shared secret/password stored in an environment variable. Check a cookie set after password entry. ~50 lines of code total. | MEDIUM |

**How it works:**
1. Middleware checks for a session cookie on every request
2. If missing, redirect to `/login`
3. `/login` page accepts a password, validates against `process.env.APP_PASSWORD`
4. On success, set an HTTP-only cookie and redirect to dashboard
5. No database, no OAuth, no third-party service

**Alternative if you want more:** Vercel's built-in password protection on Pro plan ($20/mo). But the middleware approach is free and gives you more control.

### Dev Tooling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| ESLint | 9.x | Linting | Next.js 15 ships with ESLint 9 flat config support. | HIGH |
| Prettier | 3.x | Formatting | prettier-plugin-tailwindcss auto-sorts Tailwind classes. | HIGH |
| prettier-plugin-tailwindcss | latest | Tailwind class sorting | Prevents class order debates. | HIGH |

### Deployment

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vercel | free tier | Hosting | Next.js is built by Vercel. Zero-config deployment, automatic preview deploys, edge functions for middleware. Free tier supports 1 project with custom domain. | HIGH |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Framework version | Next.js 15.5.x | Next.js 14.x | React 18 only, no Turbopack stable, shadcn/ui CLI v4 targets React 19 |
| Framework version | Next.js 15.5.x | Next.js 16.x | Too new (Oct 2025), breaking middleware rename, async API enforcement, less community coverage |
| Charts | Recharts 3.x (via shadcn) | Tremor | Tremor wraps Recharts anyway and limits low-level customization. shadcn/ui Chart components give the same polish with more flexibility |
| Charts | Recharts 3.x (via shadcn) | Nivo | More chart types than needed, heavier bundle, no shadcn integration |
| Chat SDK | Vercel AI SDK 6 | Direct @anthropic-ai/sdk | Would require manual streaming, message state management, SSE formatting. AI SDK gives you `useChat` hook and `streamText()` for free |
| Chat SDK | Vercel AI SDK 6 | LangChain | Heavy dependency for a simple chat-with-tools use case. AI SDK is lighter and Next.js-native |
| Auth | Middleware password gate | NextAuth/Auth.js | Overkill for single-user personal app. Adds database session tables, OAuth complexity |
| Auth | Middleware password gate | Supabase Auth | Already have Supabase but adding auth adds RLS complexity, email verification flows -- unnecessary for personal use |
| Auth | Middleware password gate | Clerk | Third-party service dependency and cost for a single user |
| Supabase client | @supabase/ssr | @supabase/auth-helpers-nextjs | Deprecated. All development moved to @supabase/ssr |

## What NOT to Use

| Technology | Why Not |
|------------|---------|
| next-themes (for dark mode) | shadcn/ui has built-in dark mode support via CSS variables and `next-themes` is already bundled as a dependency when you init shadcn. Don't install it separately -- let shadcn handle it. |
| @tanstack/react-query | For this read-heavy dashboard, Supabase client calls in Server Components (with revalidation) are sufficient. React Query adds complexity for client-side caching you don't need when most data loads server-side. |
| Prisma / Drizzle | You already have Supabase with supabase-js. Adding an ORM for a read-only frontend is unnecessary indirection. |
| Chart.js | Not React-native. Requires wrapper libraries. Recharts is the React standard. |
| D3 directly | Too low-level for dashboard charts. Recharts wraps D3 and gives you React components. |
| Framer Motion | Unless you specifically want page transitions. For a data dashboard, subtle CSS transitions via Tailwind are sufficient. |

## Installation

```bash
# Create Next.js 15 project
npx create-next-app@15 fintrack-dashboard --typescript --tailwind --eslint --app --src-dir --use-npm

# Initialize shadcn/ui (will install Tailwind 4, lucide-react, etc.)
npx shadcn@latest init

# Add shadcn components you'll need
npx shadcn@latest add card button input table tabs avatar badge separator skeleton sheet dialog dropdown-menu chart

# Supabase
npm install @supabase/supabase-js @supabase/ssr

# AI Chat
npm install ai @ai-sdk/anthropic

# Dev dependencies
npm install -D prettier prettier-plugin-tailwindcss
```

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # server-side only, for API routes

# Anthropic (used by AI SDK)
ANTHROPIC_API_KEY=your_anthropic_key

# Auth
APP_PASSWORD=your_dashboard_password

# MCP Server
MCP_SERVER_URL=https://claudefinancetracker.xyz/mcp
```

## Key Integration Patterns

### Supabase Client Setup (App Router)

Two clients needed per Supabase + Next.js App Router pattern:

1. **Server client** (`lib/supabase/server.ts`) -- used in Server Components, Server Actions, Route Handlers. Uses `@supabase/ssr` with cookie-based session handling.
2. **Browser client** (`lib/supabase/client.ts`) -- used in Client Components for real-time subscriptions or client-side queries.

For this dashboard (read-only, single user), most data fetching happens in Server Components using the server client. The browser client is only needed for the chat interface's potential streaming updates.

### Chat API Route Pattern

```
Client (useChat hook) <-> /api/chat (Route Handler) <-> AI SDK streamText() <-> Anthropic API <-> MCP Server tools
```

The AI SDK handles the full loop: streaming tokens to the client, executing tool calls when Claude invokes MCP tools, and resuming generation after tool results return.

## Version Compatibility Matrix

| Package | Version | React | Next.js | Notes |
|---------|---------|-------|---------|-------|
| next | 15.5.x | 19.x | -- | Stable, Turbopack ready |
| shadcn/ui | CLI v4 | 19.x | 15.x+ | March 2026 release |
| recharts | 3.8.x | 18.x/19.x | any | Via shadcn Chart component |
| @supabase/ssr | 0.9.x | any | 14.x+ | Cookie-based auth |
| ai (AI SDK) | 6.x | 19.x | 14.x+ | useChat requires React 19 |
| @ai-sdk/anthropic | latest | -- | -- | Provider package |

## Sources

- [Next.js 15 release blog](https://nextjs.org/blog/next-15) -- HIGH confidence
- [Next.js 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16) -- HIGH confidence
- [shadcn/ui CLI v4 changelog](https://ui.shadcn.com/docs/changelog/2026-03-cli-v4) -- HIGH confidence
- [shadcn/ui React 19 compatibility](https://ui.shadcn.com/docs/react-19) -- HIGH confidence
- [shadcn/ui Chart component docs](https://ui.shadcn.com/docs/components/radix/chart) -- HIGH confidence
- [Recharts npm](https://www.npmjs.com/package/recharts) -- v3.8.0, HIGH confidence
- [@supabase/ssr npm](https://www.npmjs.com/package/@supabase/ssr) -- v0.9.0, HIGH confidence
- [Supabase SSR docs for Next.js](https://supabase.com/docs/guides/auth/server-side/creating-a-client) -- HIGH confidence
- [@anthropic-ai/sdk npm](https://www.npmjs.com/package/@anthropic-ai/sdk) -- v0.78.0, HIGH confidence
- [AI SDK 6 announcement](https://vercel.com/blog/ai-sdk-6) -- HIGH confidence
- [AI SDK Anthropic provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic) -- HIGH confidence
- [Vercel basic auth template](https://vercel.com/templates/next.js/basic-auth-password) -- MEDIUM confidence
