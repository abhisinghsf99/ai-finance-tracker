# Phase 1: Foundation and Auth - Context

**Gathered:** 2025-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Project scaffolding with Next.js 15, TypeScript, Tailwind CSS, shadcn/ui. Password-protected auth gate, sidebar navigation layout, dark/light theme with system preference detection. No data fetching or page content — just the shell that all other phases build on.

</domain>

<decisions>
## Implementation Decisions

### Design System & Theme
- Copilot-style aesthetic: warm, approachable fintech — rounded cards, soft gradients, friendly colors
- Neo-grotesque typography (Satoshi or General Sans family)
- Teal/cyan primary accent color
- Dark theme default, with system preference detection + manual toggle override
- Theme toggle: sun/moon icon at bottom of sidebar
- Design system generated via UI UX Pro Max skill for fintech dashboard context
- Screen mockups created in Google Stitch (Nano Banana 2 integration) then pulled into Claude Code via Stitch MCP

### Login Page & Auth
- Full-bleed background (subtle gradient or pattern) with floating login card
- App branded as "FinTrack" on the login page
- Middleware-based password gate (env var comparison, ~50 lines of middleware)
- Session cookie duration: 30 days
- Wrong password: simple error — shake input + "Incorrect password" text, no lockout
- No multi-user auth, no OAuth, no NextAuth — just a single password

### Sidebar & Layout Shell
- Full sidebar with branding: FinTrack logo at top, icons + labels for each page (Dashboard, Transactions, Recurring, Chat), theme toggle at bottom
- Active page indicator: vertical teal/cyan accent bar on left edge of active item
- Mobile navigation: fixed bottom tab bar with 4 icons (app-like feel)
- Sidebar collapses to bottom tab bar on mobile breakpoint

### Claude's Discretion
- Exact sidebar width and spacing
- Login page gradient/pattern design details
- Loading skeleton patterns for page shells
- Empty state placeholder content for the 4 pages
- Icon choices for navigation items
- Exact breakpoint for sidebar → bottom tab transition

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `BEST_PRACTICES.md`: Contains Next.js conventions for the frontend — Server Components by default, route groups for layouts, co-located feature components, Zustand for client state, cn() utility for conditional classes
- Existing backend services (`link-account/`, `webhook/`, `mcp-server/`) use JavaScript — frontend will be TypeScript (new pattern for this project)

### Established Patterns
- Environment variable validation at startup with fail-fast — apply same pattern in Next.js middleware/config
- Prefixed console logging (`[sync]`, `[webhook]`) — adopt similar prefix convention for frontend logging
- 2-space indentation, camelCase functions, CONSTANT_CASE for module constants

### Integration Points
- Supabase service_role key: used by all existing backend services, frontend will use same key server-side in Server Components
- No frontend code exists yet — this is a greenfield Next.js project within an existing backend repo
- Frontend will live alongside existing `link-account/`, `webhook/`, `mcp-server/` directories

</code_context>

<specifics>
## Specific Ideas

- "Clean, modern fintech dashboard. Inspired by Copilot, Linear, Arc" — Copilot is the primary aesthetic reference
- Use Stitch MCP (Nano Banana 2) for screen mockups + UI UX Pro Max skill for design system generation
- Design system and screen designs should be created BEFORE implementation code
- Typography must be distinctive — no Inter, Roboto, or Arial

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-and-auth*
*Context gathered: 2025-03-10*
