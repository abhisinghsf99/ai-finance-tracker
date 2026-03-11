# Phase 1: Foundation and Auth - Research

**Researched:** 2026-03-10
**Domain:** Next.js 15 project scaffolding, password-based auth gate, sidebar layout, dark/light theming
**Confidence:** HIGH

## Summary

Phase 1 is a greenfield Next.js 15 project inside an existing backend repository. The scope is narrowly defined: scaffold the app, implement a simple password gate via middleware, build a sidebar/bottom-tab navigation shell, and set up dark/light theming with Tailwind CSS 4 + shadcn/ui. No data fetching or page content -- just the app shell.

The technical surface is well-understood. Next.js 15 middleware for cookie-based auth is a documented pattern. shadcn/ui ships with next-themes for dark mode and Tailwind CSS 4 for theming via CSS variables. The main risks are (1) the CVE-2025-29927 middleware bypass vulnerability (mitigated by using Next.js 15.2.3+), (2) accidentally over-engineering the auth gate (it should be ~50 lines), and (3) getting the custom font (Satoshi) and teal/cyan color system configured correctly with Tailwind 4's new `@theme inline` approach.

**Primary recommendation:** Use `create-next-app@15` with `--src-dir`, initialize shadcn/ui (which brings Tailwind 4 + next-themes), configure the teal/cyan color palette in `globals.css` using CSS variables + `@theme inline`, load Satoshi font via `next/font/local`, and implement the password gate as a simple middleware cookie check with an API route for validation.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Copilot-style aesthetic: warm, approachable fintech -- rounded cards, soft gradients, friendly colors
- Neo-grotesque typography (Satoshi or General Sans family)
- Teal/cyan primary accent color
- Dark theme default, with system preference detection + manual toggle override
- Theme toggle: sun/moon icon at bottom of sidebar
- Design system generated via UI UX Pro Max skill for fintech dashboard context
- Screen mockups created in Google Stitch (Nano Banana 2 integration) then pulled into Claude Code via Stitch MCP
- Full-bleed background (subtle gradient or pattern) with floating login card
- App branded as "FinTrack" on the login page
- Middleware-based password gate (env var comparison, ~50 lines of middleware)
- Session cookie duration: 30 days
- Wrong password: simple error -- shake input + "Incorrect password" text, no lockout
- No multi-user auth, no OAuth, no NextAuth -- just a single password
- Full sidebar with branding: FinTrack logo at top, icons + labels for each page (Dashboard, Transactions, Recurring, Chat), theme toggle at bottom
- Active page indicator: vertical teal/cyan accent bar on left edge of active item
- Mobile navigation: fixed bottom tab bar with 4 icons (app-like feel)
- Sidebar collapses to bottom tab bar on mobile breakpoint
- Design system and screen designs should be created BEFORE implementation code
- Typography must be distinctive -- no Inter, Roboto, or Arial

### Claude's Discretion
- Exact sidebar width and spacing
- Login page gradient/pattern design details
- Loading skeleton patterns for page shells
- Empty state placeholder content for the 4 pages
- Icon choices for navigation items
- Exact breakpoint for sidebar to bottom tab transition

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FOUND-01 | User sees a Next.js 15 app with TypeScript, Tailwind CSS, and shadcn/ui components | Project scaffolding with `create-next-app@15`, shadcn/ui init with Tailwind 4, Satoshi font via next/font/local |
| FOUND-02 | User must enter a password to access the app (middleware-based gate, session cookie) | Middleware cookie check pattern, /api/auth route handler, HttpOnly cookie with 30-day maxAge |
| FOUND-03 | All data fetched server-side via Supabase service_role key (never exposed to browser) | Server-side Supabase client utility using non-NEXT_PUBLIC env var, no browser client needed in Phase 1 |
| FOUND-04 | User navigates between pages via sidebar navigation that collapses on mobile | Sidebar component with pathname-based active state, responsive bottom tab bar at mobile breakpoint |
| FOUND-05 | User can toggle between dark (default) and light theme, preference persisted to localStorage | next-themes (bundled with shadcn/ui), ThemeProvider with defaultTheme="dark", CSS variables in globals.css |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.5.x (>=15.2.3) | App framework | Stable, Turbopack dev, React 19 support. Must be >=15.2.3 to patch CVE-2025-29927 middleware bypass. |
| React | 19.x | UI library | Required by Next.js 15, required by shadcn/ui CLI v4 |
| TypeScript | 5.x | Type safety | Ships with create-next-app |

### UI & Styling

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tailwind CSS | 4.x | Utility CSS | Installed by shadcn/ui init. Uses new `@theme inline` directive instead of tailwind.config.js |
| shadcn/ui | CLI v4 | Component library | Copy-paste components. Brings next-themes, lucide-react, radix-ui as dependencies |
| next-themes | latest | Theme persistence | Installed as shadcn/ui dependency. Handles localStorage, system detection, class toggling |
| lucide-react | latest | Icons | shadcn/ui default icon set. Use for sidebar nav icons and theme toggle |

### Server Utilities

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | 2.x | Supabase client | Server-side only in Phase 1. Creates the server client for future data pages. |

### Dev Tooling

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ESLint | 9.x | Linting | Ships with create-next-app |
| Prettier | 3.x | Formatting | Code consistency |
| prettier-plugin-tailwindcss | latest | Class sorting | Auto-sorts Tailwind classes |

### Not Needed in Phase 1

| Library | Why Not Yet |
|---------|------------|
| @supabase/ssr | No Supabase Auth in use -- the auth gate is a simple password, not Supabase Auth. The server client uses `createClient` from `@supabase/supabase-js` directly with `service_role` key. |
| Recharts | No charts until Phase 2 |
| ai / @ai-sdk/anthropic | No chat until Phase 3 |

**Installation:**
```bash
# Create Next.js 15 project (inside the existing repo)
npx create-next-app@15 fintrack-dashboard --typescript --tailwind --eslint --app --src-dir --use-npm

# Initialize shadcn/ui (installs Tailwind 4, next-themes, lucide-react, radix-ui)
npx shadcn@latest init

# Add shadcn components needed for Phase 1
npx shadcn@latest add button input card separator skeleton sheet

# Supabase client (server-side only)
npm install @supabase/supabase-js

# Dev dependencies
npm install -D prettier prettier-plugin-tailwindcss
```

## Architecture Patterns

### Recommended Project Structure (Phase 1 Only)

```
src/
├── app/
│   ├── layout.tsx              # Root layout: ThemeProvider, font, metadata
│   ├── (app)/                  # Route group for authenticated pages
│   │   ├── layout.tsx          # Sidebar + navigation shell
│   │   ├── page.tsx            # Dashboard placeholder (Server Component)
│   │   ├── transactions/
│   │   │   └── page.tsx        # Transactions placeholder
│   │   ├── recurring/
│   │   │   └── page.tsx        # Recurring placeholder
│   │   └── chat/
│   │       └── page.tsx        # Chat placeholder
│   ├── login/
│   │   └── page.tsx            # Password input (Client Component)
│   ├── api/
│   │   └── auth/
│   │       └── route.ts        # Password validation, cookie setting
│   └── globals.css             # Tailwind 4 theme + CSS variables
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx         # Desktop sidebar navigation
│   │   ├── mobile-nav.tsx      # Bottom tab bar for mobile
│   │   └── theme-toggle.tsx    # Sun/moon toggle (Client Component)
│   ├── ui/                     # shadcn/ui components (auto-generated)
│   └── theme-provider.tsx      # next-themes wrapper
├── lib/
│   ├── supabase/
│   │   └── server.ts           # createServerSupabase() factory
│   └── utils.ts                # cn() helper (from shadcn init)
├── middleware.ts                # Auth cookie check
└── public/
    └── fonts/
        ├── Satoshi-Regular.woff2
        ├── Satoshi-Medium.woff2
        ├── Satoshi-Bold.woff2
        └── Satoshi-Variable.woff2
```

### Pattern 1: Route Group for Auth Layout

**What:** Use a `(app)` route group so authenticated pages share a sidebar layout while `/login` does not.

**When:** Always -- the login page has a completely different layout (full-bleed background, centered card) from the app pages (sidebar + content area).

**Example:**
```typescript
// src/app/(app)/layout.tsx -- shared sidebar layout for authenticated pages
import { Sidebar } from '@/components/layout/sidebar'
import { MobileNav } from '@/components/layout/mobile-nav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar className="hidden md:flex" />
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
      <MobileNav className="md:hidden" />
    </div>
  )
}
```

### Pattern 2: Middleware Password Gate

**What:** Check for a session cookie on every request. If missing, redirect to `/login`. The cookie is set by an API route after password validation.

**When:** Every non-login, non-API-auth route.

**Example:**
```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const session = request.cookies.get('fintrack-session')

  // Allow login page and auth API route
  if (
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/api/auth')
  ) {
    // If already authenticated and visiting /login, redirect to dashboard
    if (session?.value && request.nextUrl.pathname.startsWith('/login')) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  // No session cookie → redirect to login
  if (!session?.value) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Validate session value matches expected token
  // (Simple approach: session value is a signed/hashed token)
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|fonts/).*)'],
}
```

### Pattern 3: Auth API Route

**What:** POST endpoint that validates the password against an env var and sets an HttpOnly cookie.

**Example:**
```typescript
// src/app/api/auth/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  const { password } = await request.json()

  if (password !== process.env.APP_PASSWORD) {
    return NextResponse.json(
      { error: 'Incorrect password' },
      { status: 401 }
    )
  }

  // Create a simple session token (hash of password + secret)
  const sessionToken = generateSessionToken()

  const response = NextResponse.json({ success: true })
  response.cookies.set({
    name: 'fintrack-session',
    value: sessionToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })

  return response
}
```

### Pattern 4: Tailwind 4 Theme with Teal/Cyan Accent

**What:** Define the complete color system using CSS variables in `globals.css` with the `@theme inline` directive. shadcn/ui components automatically use these variables.

**Example:**
```css
/* src/app/globals.css */
@import "tailwindcss";

:root {
  --background: hsl(0 0% 100%);
  --foreground: hsl(222 47% 11%);
  --card: hsl(0 0% 100%);
  --card-foreground: hsl(222 47% 11%);
  --primary: hsl(175 70% 41%);        /* teal/cyan accent */
  --primary-foreground: hsl(0 0% 100%);
  --secondary: hsl(210 40% 96%);
  --secondary-foreground: hsl(222 47% 11%);
  --muted: hsl(210 40% 96%);
  --muted-foreground: hsl(215 16% 47%);
  --accent: hsl(175 70% 41%);
  --accent-foreground: hsl(0 0% 100%);
  --destructive: hsl(0 84% 60%);
  --destructive-foreground: hsl(0 0% 100%);
  --border: hsl(214 32% 91%);
  --input: hsl(214 32% 91%);
  --ring: hsl(175 70% 41%);
  --radius: 0.75rem;                   /* rounded cards */
}

.dark {
  --background: hsl(222 47% 5%);
  --foreground: hsl(210 40% 98%);
  --card: hsl(222 47% 8%);
  --card-foreground: hsl(210 40% 98%);
  --primary: hsl(175 70% 50%);        /* slightly brighter teal for dark */
  --primary-foreground: hsl(222 47% 5%);
  --secondary: hsl(217 33% 17%);
  --secondary-foreground: hsl(210 40% 98%);
  --muted: hsl(217 33% 17%);
  --muted-foreground: hsl(215 20% 65%);
  --accent: hsl(175 70% 50%);
  --accent-foreground: hsl(222 47% 5%);
  --destructive: hsl(0 63% 31%);
  --destructive-foreground: hsl(210 40% 98%);
  --border: hsl(217 33% 17%);
  --input: hsl(217 33% 17%);
  --ring: hsl(175 70% 50%);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}
```

### Pattern 5: Custom Font with next/font/local

**What:** Load Satoshi font files locally via `next/font/local` for zero layout shift and self-hosting.

**Example:**
```typescript
// src/app/layout.tsx
import localFont from 'next/font/local'
import { ThemeProvider } from '@/components/theme-provider'

const satoshi = localFont({
  src: [
    { path: '../../public/fonts/Satoshi-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/Satoshi-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../../public/fonts/Satoshi-Bold.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-satoshi',
  display: 'swap',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={satoshi.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

Then in `globals.css` (inside the `@theme inline` block):
```css
@theme inline {
  --font-sans: var(--font-satoshi), system-ui, sans-serif;
  /* ... other theme vars */
}
```

### Pattern 6: ThemeProvider with Dark Default

**What:** Wrap the app in next-themes ThemeProvider with `defaultTheme="dark"` and `enableSystem`.

**Behavior:** First visit defaults to dark. If user's OS is set to light, it respects that (because `enableSystem` is true). Once the user manually toggles, their preference is saved to localStorage and overrides system detection.

```typescript
// src/components/theme-provider.tsx
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```

### Anti-Patterns to Avoid

- **`"use client"` on page.tsx files:** Even placeholder pages should remain Server Components. Only leaf interactive components (sidebar, theme toggle, login form) need `"use client"`.
- **Using `NEXT_PUBLIC_` prefix for service_role key:** Never. The `SUPABASE_SERVICE_ROLE_KEY` env var must be server-only. Next.js excludes non-NEXT_PUBLIC vars from the client bundle.
- **Over-engineering the session token:** For a single-user personal app, a simple token (e.g., `crypto.randomUUID()` stored in the cookie and validated by the API route) is sufficient. No JWT, no bcrypt, no database sessions.
- **Installing next-themes separately:** shadcn/ui init already installs it. Don't double-install.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dark/light theme toggle with persistence | Custom localStorage + useEffect + class toggling | next-themes (via shadcn/ui) | Handles SSR hydration mismatch, system preference detection, localStorage sync, class attribute toggling. 5 lines vs 50+ lines of buggy custom code. |
| CSS variable theming system | Custom CSS-in-JS or manual Tailwind config | shadcn/ui `@theme inline` in globals.css | Already designed to work with all shadcn components. Custom approach breaks component styling. |
| Icon system | Custom SVG imports or icon font | lucide-react (via shadcn/ui) | 1000+ icons, tree-shakeable, consistent sizing, already integrated with shadcn components. |
| Component primitives (Sheet, Dialog, etc.) | Custom modal/drawer/dropdown | shadcn/ui components from radix-ui | Accessibility (keyboard nav, focus trap, screen reader), animation, portal rendering. Custom implementations miss edge cases. |
| Font loading with zero CLS | Manual `<link>` tags or @font-face | next/font/local | Automatic subsetting, preloading, zero layout shift, CSS variable injection. |

## Common Pitfalls

### Pitfall 1: CVE-2025-29927 -- Middleware Bypass

**What goes wrong:** Next.js versions before 15.2.3 have a critical vulnerability where attackers can bypass middleware entirely by manipulating the `x-middleware-subrequest` header. The password gate becomes useless.
**Why it happens:** The header was meant for internal loop prevention but was externally spoofable.
**How to avoid:** Use Next.js >= 15.2.3. Verify with `npx next --version` after install.
**Warning signs:** Any external user can access protected routes without a password.
**Confidence:** HIGH -- verified via official Vercel postmortem.

### Pitfall 2: Theme Flash on First Load

**What goes wrong:** User sees a brief flash of light theme before dark theme applies, especially on hard refresh.
**Why it happens:** next-themes injects a script to set the theme before React hydrates, but if `suppressHydrationWarning` is missing on `<html>`, React throws a mismatch warning and may reset the class.
**How to avoid:** Always add `suppressHydrationWarning` to the `<html>` tag. Use `disableTransitionOnChange` on ThemeProvider. Set `defaultTheme="dark"` so the server render matches the most common case.
**Warning signs:** Visible white flash when loading a dark-themed page.
**Confidence:** HIGH -- verified via shadcn/ui official docs.

### Pitfall 3: Tailwind 4 Migration -- No tailwind.config.js

**What goes wrong:** Developer creates a `tailwind.config.js` or `tailwind.config.ts` file to add custom colors/fonts, which conflicts with Tailwind 4's CSS-first configuration approach.
**Why it happens:** Most tutorials and training data reference Tailwind 3's config-file approach. Tailwind 4 uses `@theme inline` in CSS instead.
**How to avoid:** All custom theme values go in `globals.css` inside `@theme inline { }`. No config file needed. shadcn/ui init handles this correctly.
**Warning signs:** Custom colors don't work, or Tailwind generates duplicate/conflicting utilities.
**Confidence:** HIGH -- verified via shadcn/ui Tailwind v4 docs.

### Pitfall 4: Cookie Not Persisting in Production

**What goes wrong:** Session cookie works in localhost but disappears on Vercel deployment.
**Why it happens:** The `secure: true` flag requires HTTPS. Localhost is HTTP. If you hardcode `secure: true` during development, cookies won't be set locally. Conversely, if you forget it in production, cookies may be sent over insecure connections.
**How to avoid:** Set `secure: process.env.NODE_ENV === 'production'`. This automatically handles both environments.
**Warning signs:** Auth works locally, breaks on Vercel preview/production.
**Confidence:** HIGH -- common Next.js deployment issue.

### Pitfall 5: Middleware Matcher Too Broad

**What goes wrong:** Middleware runs on static asset requests (`_next/static`, images, fonts), causing redirects on assets or unnecessary processing.
**Why it happens:** Default middleware runs on all routes. Without a proper matcher, every CSS file and image triggers the auth check.
**How to avoid:** Use a negative lookahead matcher: `['/((?!_next/static|_next/image|favicon.ico|fonts/).*)']`
**Warning signs:** Broken CSS/images, or slow asset loading.
**Confidence:** HIGH -- standard Next.js middleware pattern.

### Pitfall 6: Font Files Not Found at Build Time

**What goes wrong:** `next/font/local` can't find the font files because the `src` path is relative to the file where `localFont()` is called, not relative to the project root.
**Why it happens:** Path resolution in `next/font/local` is relative to the importing file (e.g., `src/app/layout.tsx`), not to `public/` or project root.
**How to avoid:** If calling `localFont()` from `src/app/layout.tsx` and fonts are in `public/fonts/`, the path is `../../public/fonts/Satoshi-Regular.woff2`. Alternatively, place fonts in `src/fonts/` and use `../fonts/`.
**Warning signs:** Build error: "Could not load font file."
**Confidence:** HIGH -- verified via Next.js font docs.

## Code Examples

### Theme Toggle Component (Sun/Moon Icon)

```typescript
// src/components/layout/theme-toggle.tsx
"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  if (!mounted) return <Button variant="ghost" size="icon" className="h-9 w-9" />

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {resolvedTheme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
```

### Sidebar Active State with Vertical Accent Bar

```typescript
// Pattern for sidebar nav item with teal accent bar
// Source: project CONTEXT.md decision

function NavItem({ href, icon: Icon, label }: NavItemProps) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Link
      href={href}
      className={cn(
        "relative flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:text-foreground",
        isActive && "text-foreground bg-accent/10"
      )}
    >
      {/* Vertical teal accent bar */}
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-full bg-primary" />
      )}
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  )
}
```

### Login Page Client Component

```typescript
// src/app/login/page.tsx
"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push('/')
      router.refresh()
    } else {
      setShake(true)
      setError('Incorrect password')
      setTimeout(() => setShake(false), 500)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted">
      <Card className={cn("w-full max-w-sm", shake && "animate-shake")}>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">FinTrack</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">
              Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

### Supabase Server Client (Phase 1 Setup, Used in Phase 2+)

```typescript
// src/lib/supabase/server.ts
import { createClient } from '@supabase/supabase-js'

export function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      '[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
    )
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  })
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| tailwind.config.js for custom colors | `@theme inline` in globals.css | Tailwind 4 (2025) | No config file needed. All theme values in CSS. |
| Multiple `@radix-ui/react-*` packages | Single `radix-ui` dependency | shadcn/ui CLI v4 (March 2026) | Simpler dependency management |
| `tailwindcss-animate` | `tw-animate-css` | shadcn/ui v4 | Lighter animation utilities |
| `forwardRef` in components | Direct ref prop (React 19) | React 19 / shadcn v4 | Simpler component code, `data-slot` for styling |
| Middleware as sole auth layer | Defense-in-depth (middleware + data access layer) | CVE-2025-29927 (March 2025) | Never rely on middleware alone for security-critical checks |

## Open Questions

1. **Satoshi Font Licensing for Production**
   - What we know: Satoshi is free for personal use via Fontshare. Commercial use may require contacting Indian Type Foundry.
   - What's unclear: Whether a personal finance dashboard qualifies as "personal use" under the Fontshare license.
   - Recommendation: Download from Fontshare (free tier allows web use). If licensing is a concern, General Sans (also from Fontshare) is a safe alternative with the same neo-grotesque aesthetic.

2. **Session Token Validation Strategy**
   - What we know: The middleware checks for a cookie. The cookie is set by the API route.
   - What's unclear: How to validate the cookie value without a database. Simple options: (a) store a random UUID in an env var and compare, (b) use `crypto.subtle.sign` to create an HMAC of a known value and verify it.
   - Recommendation: Use approach (b) -- HMAC-sign a fixed payload with a secret env var. This prevents cookie forgery without a database lookup. About 10 lines of code.

3. **Design System Generation Timing**
   - What we know: CONTEXT.md says "Design system and screens should be created BEFORE implementation code" and to use UI UX Pro Max skill + Stitch MCP.
   - What's unclear: Whether the design system generation is a separate task or part of the first implementation task.
   - Recommendation: Make it Wave 0 / Plan 1 -- generate the design system and screen mockups first, then implement in subsequent plans.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.x (recommended for Next.js 15 + React 19) |
| Config file | none -- see Wave 0 |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUND-01 | Next.js app renders with correct components | smoke | `npm run build` (build succeeds = basic structural validity) | N/A |
| FOUND-02 | Middleware redirects unauthenticated users; API route sets cookie on correct password | unit | `npx vitest run src/__tests__/middleware.test.ts -t "redirect"` | Wave 0 |
| FOUND-02 | API route rejects wrong password with 401 | unit | `npx vitest run src/__tests__/auth-api.test.ts -t "reject"` | Wave 0 |
| FOUND-03 | Service role key not in client bundle | manual-only | Inspect browser network tab / source map. Justification: requires running browser and checking devtools, not automatable with unit tests. | N/A |
| FOUND-04 | Sidebar renders 4 nav items; active state matches pathname | unit | `npx vitest run src/__tests__/sidebar.test.ts` | Wave 0 |
| FOUND-05 | Theme toggle switches between dark/light; preference persists | unit | `npx vitest run src/__tests__/theme-toggle.test.ts` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run && npm run build`
- **Phase gate:** Full suite green + manual check of FOUND-03 (service key not exposed) before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `vitest.config.ts` -- Vitest configuration with React Testing Library setup
- [ ] `src/__tests__/middleware.test.ts` -- covers FOUND-02 (redirect behavior)
- [ ] `src/__tests__/auth-api.test.ts` -- covers FOUND-02 (password validation)
- [ ] `src/__tests__/sidebar.test.ts` -- covers FOUND-04 (navigation items)
- [ ] `src/__tests__/theme-toggle.test.ts` -- covers FOUND-05 (theme switching)
- [ ] Framework install: `npm install -D vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react jsdom`

## Sources

### Primary (HIGH confidence)
- [shadcn/ui Tailwind v4 docs](https://ui.shadcn.com/docs/tailwind-v4) -- CSS variable approach, @theme inline
- [shadcn/ui Dark Mode Next.js](https://ui.shadcn.com/docs/dark-mode/next) -- ThemeProvider setup, next-themes config
- [shadcn/ui Next.js Installation](https://ui.shadcn.com/docs/installation/next) -- init command, component installation
- [Next.js Authentication Guide](https://nextjs.org/docs/app/guides/authentication) -- middleware patterns, cookie security
- [Next.js Font Optimization](https://nextjs.org/docs/app/getting-started/fonts) -- next/font/local usage
- [CVE-2025-29927 Vercel Postmortem](https://nextjs.org/blog/cve-2025-29927) -- middleware bypass fix

### Secondary (MEDIUM confidence)
- [Fontshare Satoshi](https://www.fontshare.com/fonts/satoshi) -- font availability and licensing
- [Setting Up Next.js 15 with ShadCN & Tailwind CSS v4](https://dev.to/darshan_bajgain/setting-up-2025-nextjs-15-with-shadcn-tailwind-css-v4-no-config-needed-dark-mode-5kl) -- community walkthrough verified against official docs

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries are from existing project research (STACK.md), verified against official docs
- Architecture: HIGH -- route groups, middleware patterns, and shadcn/ui setup are well-documented
- Pitfalls: HIGH -- CVE verified via Vercel postmortem, cookie issues are well-known deployment problems
- Code examples: MEDIUM -- patterns synthesized from official docs and project decisions, not copy-pasted from a single verified source

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (stable stack, no fast-moving dependencies)
