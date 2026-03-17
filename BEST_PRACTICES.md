# Best Practices: Next.js 14 Finance Dashboard with Supabase + Anthropic MCP

> Opinionated guide. One recommendation per category. No "it depends."
> Last updated: 2026-03-09

---

## 1. Project Structure and File Organization

Use the `src/` directory. Keep config at the root, all app code inside `src/`.

```
ai-finance-tracker/
├── public/                          # Static assets (favicon, images)
├── src/
│   ├── app/                         # App Router — routes only, minimal logic
│   │   ├── (auth)/                  # Route group: login, signup
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── (dashboard)/             # Route group: authenticated pages
│   │   │   ├── layout.tsx           # Dashboard shell (sidebar, topbar)
│   │   │   ├── page.tsx             # Overview / home dashboard
│   │   │   ├── transactions/page.tsx
│   │   │   ├── analytics/page.tsx
│   │   │   └── chat/page.tsx        # Chat interface for Anthropic MCP
│   │   ├── api/                     # Route handlers (API proxy layer)
│   │   │   ├── chat/route.ts
│   │   │   └── transactions/route.ts
│   │   ├── layout.tsx               # Root layout (html, body, providers)
│   │   ├── loading.tsx              # Root loading skeleton
│   │   ├── error.tsx                # Root error boundary
│   │   └── not-found.tsx
│   ├── components/
│   │   ├── ui/                      # Primitives: Button, Card, Input, Badge
│   │   ├── charts/                  # Chart wrappers: SpendingChart, IncomeChart
│   │   ├── layout/                  # Sidebar, Topbar, MobileNav
│   │   └── features/               # Feature-specific composites
│   │       ├── transactions/        # TransactionTable, TransactionRow
│   │       ├── analytics/           # SpendingBreakdown, TrendCard
│   │       └── chat/               # ChatWindow, MessageBubble, ChatInput
│   ├── hooks/                       # Custom hooks (useTransactions, useChat)
│   ├── lib/                         # Clients and core logic
│   │   ├── supabase/
│   │   │   ├── client.ts            # Browser client (createBrowserClient)
│   │   │   ├── server.ts            # Server client (createServerClient)
│   │   │   └── admin.ts             # Service role client (server-only)
│   │   ├── anthropic.ts             # Anthropic SDK wrapper
│   │   └── utils.ts                 # formatCurrency, cn(), date helpers
│   ├── providers/                   # React context providers
│   │   ├── theme-provider.tsx
│   │   └── query-provider.tsx
│   ├── stores/                      # Zustand stores
│   │   ├── chat-store.ts
│   │   └── filter-store.ts
│   ├── types/                       # Shared TypeScript types
│   │   ├── database.ts              # Supabase generated types
│   │   ├── transactions.ts
│   │   └── chat.ts
│   └── styles/
│       └── globals.css              # Tailwind directives + CSS variables
├── supabase/                        # Supabase migrations and config
│   └── migrations/
├── .env.local                       # Local secrets (NEVER committed)
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

**Rules:**
- Route files (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`) contain zero business logic. They compose components.
- Use route groups `(auth)` and `(dashboard)` to share layouts without polluting URLs.
- Co-locate feature components: everything for "transactions" lives in `components/features/transactions/`.
- The `lib/` folder is for clients and pure functions. The `hooks/` folder is for React hooks. Don't mix them.

---

## 2. TypeScript Patterns for React

### Use `type` for everything, reserve `interface` for extension

```typescript
// types/transactions.ts
type Transaction = {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  user_id: string;
};

type TransactionFilters = {
  dateRange: [Date, Date];
  categories: string[];
  minAmount?: number;
  maxAmount?: number;
};
```

Use `interface` only when you need declaration merging (rare — mostly for extending third-party types).

### Prop typing: inline for simple, extracted for reused

```typescript
// Simple — inline is fine
function Badge({ label, variant }: { label: string; variant: "success" | "warning" | "error" }) {
  return <span className={variants[variant]}>{label}</span>;
}

// Complex or reused — extract the type
type TransactionRowProps = {
  transaction: Transaction;
  onSelect: (id: string) => void;
  isSelected: boolean;
};

function TransactionRow({ transaction, onSelect, isSelected }: TransactionRowProps) {
  // ...
}
```

### Server Components are the default. Mark client components explicitly.

```typescript
// This is a Server Component by default — no directive needed.
// It can do async data fetching directly.
async function TransactionsPage() {
  const supabase = await createServerClient();
  const { data } = await supabase.from("transactions").select("*");
  return <TransactionTable data={data ?? []} />;
}
```

```typescript
// components/features/transactions/transaction-filters.tsx
"use client"; // Only add this when you NEED useState, useEffect, event handlers, or browser APIs

import { useState } from "react";

export function TransactionFilters({ onFilterChange }: { onFilterChange: (f: TransactionFilters) => void }) {
  const [category, setCategory] = useState<string>("all");
  // ...
}
```

**Rule of thumb:** Push `"use client"` as far down the component tree as possible. The parent fetches data (server), the child handles interaction (client).

### Typing Supabase with generated types

```bash
npx supabase gen types typescript --project-id your-project-id > src/types/database.ts
```

```typescript
// lib/supabase/server.ts
import { createServerClient as _createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

export async function createServerClient() {
  const cookieStore = await cookies();
  return _createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}
```

---

## 3. Data Fetching Patterns

### Server Components for reads. Route handlers for mutations and external API calls.

**Pattern 1: Direct database reads in Server Components (preferred for all read operations)**

```typescript
// app/(dashboard)/transactions/page.tsx
import { createServerClient } from "@/lib/supabase/server";
import { TransactionTable } from "@/components/features/transactions/transaction-table";

export default async function TransactionsPage() {
  const supabase = await createServerClient();

  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("*")
    .order("date", { ascending: false })
    .limit(50);

  if (error) throw error; // Caught by error.tsx

  return <TransactionTable transactions={transactions} />;
}
```

**Pattern 2: Route handlers for mutations (POST/PUT/DELETE)**

```typescript
// app/api/transactions/route.ts
import { createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const CreateTransactionSchema = z.object({
  amount: z.number(),
  category: z.string().min(1),
  description: z.string().min(1),
  date: z.string().datetime(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CreateTransactionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("transactions")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
```

**Pattern 3: Client-side fetching only for real-time or user-driven updates**

```typescript
"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useTransactions(filters: TransactionFilters) {
  const params = new URLSearchParams(/* serialize filters */);
  const { data, error, isLoading, mutate } = useSWR(
    `/api/transactions?${params}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  return { transactions: data ?? [], error, isLoading, refresh: mutate };
}
```

**When to use which:**

| Scenario | Pattern |
|---|---|
| Page load data | Server Component (direct Supabase query) |
| Create/update/delete | Route handler + client fetch |
| Filters changing on same page | SWR or `router.push` with searchParams |
| Real-time updates | Supabase Realtime subscription (client) |
| Chat streaming | Route handler with ReadableStream |

---

## 4. State Management

### Zustand for global client state. Server Components for server state. That's it.

Skip Redux. Skip Jotai. Zustand is the right tool for a dashboard: tiny API, no boilerplate, no re-render storms, SSR-compatible.

```typescript
// stores/filter-store.ts
import { create } from "zustand";

type DateRange = { from: Date; to: Date };

type FilterState = {
  dateRange: DateRange;
  categories: string[];
  searchQuery: string;
  setDateRange: (range: DateRange) => void;
  toggleCategory: (category: string) => void;
  setSearchQuery: (query: string) => void;
  reset: () => void;
};

const defaultFilters = {
  dateRange: { from: new Date(Date.now() - 30 * 86400000), to: new Date() },
  categories: [],
  searchQuery: "",
};

export const useFilterStore = create<FilterState>((set) => ({
  ...defaultFilters,
  setDateRange: (dateRange) => set({ dateRange }),
  toggleCategory: (category) =>
    set((state) => ({
      categories: state.categories.includes(category)
        ? state.categories.filter((c) => c !== category)
        : [...state.categories, category],
    })),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  reset: () => set(defaultFilters),
}));
```

```typescript
// stores/chat-store.ts
import { create } from "zustand";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

type ChatState = {
  messages: Message[];
  isStreaming: boolean;
  addMessage: (msg: Message) => void;
  updateLastMessage: (content: string) => void;
  setStreaming: (v: boolean) => void;
  clearChat: () => void;
};

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isStreaming: false,
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  updateLastMessage: (content) =>
    set((s) => ({
      messages: s.messages.map((m, i) =>
        i === s.messages.length - 1 ? { ...m, content } : m
      ),
    })),
  setStreaming: (isStreaming) => set({ isStreaming }),
  clearChat: () => set({ messages: [], isStreaming: false }),
}));
```

**Rules:**
- URL searchParams are state too. Use them for filter state that should be shareable/bookmarkable.
- Never put server-fetched data into Zustand. Let Server Components or SWR own that.
- Use Zustand only for UI state (sidebar open, active filters, chat messages, modals).

---

## 5. Styling with Tailwind CSS

### CSS variables as design tokens + `next-themes` for dark/light toggle

```css
/* src/styles/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Colors — HSL format for easy manipulation */
    --background: 0 0% 100%;
    --foreground: 222 47% 11%;
    --card: 0 0% 100%;
    --card-foreground: 222 47% 11%;
    --primary: 221 83% 53%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222 47% 11%;
    --muted: 210 40% 96%;
    --muted-foreground: 215 16% 47%;
    --accent: 210 40% 96%;
    --accent-foreground: 222 47% 11%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 210 40% 98%;
    --border: 214 32% 91%;
    --ring: 221 83% 53%;
    --radius: 0.5rem;

    /* Finance-specific tokens */
    --income: 142 71% 45%;
    --expense: 0 84% 60%;
    --savings: 221 83% 53%;

    /* Spacing scale */
    --space-page: 1.5rem;
    --space-card: 1rem;
    --space-section: 2rem;
  }

  .dark {
    --background: 222 47% 11%;
    --foreground: 210 40% 98%;
    --card: 217 33% 17%;
    --card-foreground: 210 40% 98%;
    --primary: 217 91% 60%;
    --primary-foreground: 222 47% 11%;
    --secondary: 217 33% 17%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217 33% 17%;
    --muted-foreground: 215 20% 65%;
    --accent: 217 33% 17%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 63% 31%;
    --destructive-foreground: 210 40% 98%;
    --border: 217 33% 25%;
    --ring: 217 91% 60%;

    --income: 142 71% 45%;
    --expense: 0 63% 50%;
    --savings: 217 91% 60%;
  }
}
```

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        border: "hsl(var(--border))",
        ring: "hsl(var(--ring))",
        income: "hsl(var(--income))",
        expense: "hsl(var(--expense))",
        savings: "hsl(var(--savings))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      spacing: {
        page: "var(--space-page)",
        card: "var(--space-card)",
        section: "var(--space-section)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

### Theme toggle with `next-themes`

```typescript
// providers/theme-provider.tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
```

```typescript
// components/ui/theme-toggle.tsx
"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="rounded-md p-2 hover:bg-accent"
      aria-label="Toggle theme"
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </button>
  );
}
```

**Rules:**
- Never hardcode colors. Always use semantic tokens (`bg-card`, `text-foreground`, `text-income`).
- Use the spacing tokens for consistent padding: `p-card` inside cards, `p-page` for page margins, `gap-section` between sections.
- Use `cn()` (clsx + tailwind-merge) for conditional classes. Install `clsx` and `tailwind-merge`.

```typescript
// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## 6. Charts and Data Visualization

### Use Recharts via shadcn/ui chart components

Recharts is the dominant React charting library (3.6M+ weekly npm downloads), and shadcn/ui provides pre-styled, copy-paste chart components that wrap Recharts with your design tokens. This gives you theme-aware charts with zero config.

```bash
npx shadcn@latest add chart
```

```typescript
// components/charts/spending-by-category.tsx
"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

type SpendingData = {
  category: string;
  amount: number;
  color: string;
};

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--expense))",
  "hsl(var(--income))",
  "hsl(var(--savings))",
  "hsl(var(--muted-foreground))",
];

export function SpendingByCategory({ data }: { data: SpendingData[] }) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={4}
            dataKey="amount"
            nameKey="category"
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "var(--radius)",
              color: "hsl(var(--foreground))",
            }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, "Amount"]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
```

```typescript
// components/charts/monthly-trend.tsx
"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";

type MonthlyData = {
  month: string;
  income: number;
  expenses: number;
};

export function MonthlyTrend({ data }: { data: MonthlyData[] }) {
  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--income))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--income))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--expense))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--expense))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${v}`} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "var(--radius)",
            }}
          />
          <Area type="monotone" dataKey="income" stroke="hsl(var(--income))" fill="url(#incomeGrad)" strokeWidth={2} />
          <Area type="monotone" dataKey="expenses" stroke="hsl(var(--expense))" fill="url(#expenseGrad)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
```

**Rules:**
- Always wrap charts in `ResponsiveContainer`. Never set fixed widths.
- Use CSS variables for chart colors so they respond to dark/light mode automatically.
- Charts are always client components (they use DOM APIs). Keep them leaf-level.
- For large datasets (1000+ points), downsample on the server before sending to the chart.

---

## 7. API Route Patterns for External APIs

### Anthropic chat proxy with streaming

```typescript
// app/api/chat/route.ts
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";
import { z } from "zod";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!, // Server-only, never exposed
});

const ChatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1).max(10000),
    })
  ),
});

export async function POST(req: NextRequest) {
  // 1. Authenticate
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 2. Validate input
  const body = await req.json();
  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 3. Fetch user's financial context for the system prompt
  const { data: recentTx } = await supabase
    .from("transactions")
    .select("amount, category, description, date")
    .order("date", { ascending: false })
    .limit(20);

  const systemPrompt = `You are a personal finance assistant. The user's recent transactions:
${JSON.stringify(recentTx, null, 2)}
Answer questions about their spending, budgets, and financial goals. Be concise and actionable.`;

  // 4. Stream the response
  const stream = await anthropic.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages: parsed.data.messages,
  });

  // 5. Return as a ReadableStream
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          controller.enqueue(encoder.encode(event.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
```

### Client-side streaming consumption

```typescript
// hooks/use-chat.ts
"use client";

import { useChatStore } from "@/stores/chat-store";
import { useCallback } from "react";

export function useChat() {
  const { messages, isStreaming, addMessage, updateLastMessage, setStreaming } = useChatStore();

  const sendMessage = useCallback(async (content: string) => {
    const userMsg = { id: crypto.randomUUID(), role: "user" as const, content, timestamp: new Date() };
    addMessage(userMsg);

    const assistantMsg = { id: crypto.randomUUID(), role: "assistant" as const, content: "", timestamp: new Date() };
    addMessage(assistantMsg);
    setStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!res.ok) throw new Error(`Chat failed: ${res.status}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        updateLastMessage(accumulated);
      }
    } catch (err) {
      updateLastMessage("Sorry, something went wrong. Please try again.");
      console.error(err);
    } finally {
      setStreaming(false);
    }
  }, [messages, addMessage, updateLastMessage, setStreaming]);

  return { messages, isStreaming, sendMessage };
}
```

### Supabase data proxy (for client-side filtered queries)

```typescript
// app/api/transactions/route.ts
import { createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = supabase
    .from("transactions")
    .select("*")
    .order("date", { ascending: false });

  if (category && category !== "all") query = query.eq("category", category);
  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);

  const { data, error } = await query.limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
```

**Rules:**
- Every route handler: authenticate first, validate input with Zod, then execute.
- Never expose API keys to the client. Anthropic calls always go through a route handler.
- Use streaming for chat responses. Never wait for the full response before sending to the client.
- Rate-limit the chat endpoint in production (use Vercel's `@vercel/kv` or Upstash for a token bucket).

---

## 8. Error Handling and Loading States

### Use Next.js file conventions + granular Suspense boundaries

```typescript
// app/(dashboard)/loading.tsx — route-level skeleton
export default function DashboardLoading() {
  return (
    <div className="grid gap-section p-page">
      <div className="grid grid-cols-1 gap-card sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-card lg:grid-cols-2">
        <div className="h-[350px] animate-pulse rounded-lg bg-muted" />
        <div className="h-[350px] animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  );
}
```

```typescript
// app/(dashboard)/error.tsx — route-level error boundary
"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to your error tracking service (Sentry, etc.)
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-page">
      <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
      <p className="text-sm text-muted-foreground">
        {error.message || "An unexpected error occurred."}
      </p>
      <button
        onClick={reset}
        className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  );
}
```

### Granular Suspense for independent data sections

```typescript
// app/(dashboard)/page.tsx
import { Suspense } from "react";
import { KPICards } from "@/components/features/analytics/kpi-cards";
import { MonthlyTrend } from "@/components/charts/monthly-trend";
import { RecentTransactions } from "@/components/features/transactions/recent-transactions";

function CardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-card sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return <div className="h-[350px] animate-pulse rounded-lg bg-muted" />;
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="grid gap-section p-page">
      <Suspense fallback={<CardsSkeleton />}>
        <KPICards />
      </Suspense>

      <div className="grid grid-cols-1 gap-card lg:grid-cols-2">
        <Suspense fallback={<ChartSkeleton />}>
          <MonthlyTrend />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <RecentTransactions />
        </Suspense>
      </div>
    </div>
  );
}
```

**Rules:**
- Wrap each independent async Server Component in its own `<Suspense>` boundary. This enables streaming — fast sections appear first while slow ones load.
- Skeletons must match the layout shape of the real content. Same height, same grid structure. This prevents layout shift (CLS).
- Error boundaries go around Suspense boundaries, not inside. Error boundary catches what Suspense can't handle.
- For client-side errors in hooks, return `{ error, isLoading }` and handle in the component. Don't throw in client code.

---

## 9. Security

### Environment variables, RLS, auth gating — defense in depth

**Environment variables:**

```env
# .env.local — NEVER committed to git
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...         # Safe for client (RLS protects it)
SUPABASE_SERVICE_ROLE_KEY=eyJ...              # Server-only, NEVER prefix with NEXT_PUBLIC_
ANTHROPIC_API_KEY=sk-ant-...                  # Server-only
```

Add to `.gitignore`:
```
.env.local
.env*.local
```

**Row Level Security — enable on EVERY table:**

```sql
-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Users can only read their own transactions
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own transactions
CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own transactions
CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own transactions
CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);
```

**Middleware for auth gating:**

```typescript
// middleware.ts (root of project, NOT inside src/)
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh the auth token
  const { data: { user } } = await supabase.auth.getUser();

  // Redirect unauthenticated users to login
  if (!user && !request.nextUrl.pathname.startsWith("/login") && !request.nextUrl.pathname.startsWith("/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (user && (request.nextUrl.pathname.startsWith("/login") || request.nextUrl.pathname.startsWith("/signup"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/webhook).*)"],
};
```

**Additional hardening:**

```typescript
// lib/supabase/admin.ts — service role client for server-only admin operations
import "server-only"; // This import PREVENTS this module from being bundled into client code

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

**Security checklist:**

- [ ] RLS enabled on every table in the `public` schema
- [ ] `SUPABASE_SERVICE_ROLE_KEY` and `ANTHROPIC_API_KEY` have no `NEXT_PUBLIC_` prefix
- [ ] `import "server-only"` at the top of any file using service role or API keys
- [ ] Middleware redirects unauthenticated users before any page renders
- [ ] All route handler inputs validated with Zod before touching the database
- [ ] `.env.local` is in `.gitignore`
- [ ] Chat endpoint rate-limited in production
- [ ] CSP headers configured in `next.config.ts` for production

---

## 10. Performance

### Code splitting, lazy loading, memoization — only where it matters

**Lazy load heavy client components (charts, chat):**

```typescript
// app/(dashboard)/analytics/page.tsx
import dynamic from "next/dynamic";
import { Suspense } from "react";

// Charts are heavy. Don't load them in the initial bundle.
const MonthlyTrend = dynamic(
  () => import("@/components/charts/monthly-trend").then((m) => ({ default: m.MonthlyTrend })),
  { ssr: false } // Charts need DOM APIs, skip SSR
);

const SpendingByCategory = dynamic(
  () => import("@/components/charts/spending-by-category").then((m) => ({ default: m.SpendingByCategory })),
  { ssr: false }
);

export default async function AnalyticsPage() {
  // Fetch data on server
  const [trendData, categoryData] = await Promise.all([
    fetchMonthlyTrend(),
    fetchSpendingByCategory(),
  ]);

  return (
    <div className="grid gap-section p-page">
      <Suspense fallback={<div className="h-[350px] animate-pulse rounded-lg bg-muted" />}>
        <MonthlyTrend data={trendData} />
      </Suspense>
      <Suspense fallback={<div className="h-[300px] animate-pulse rounded-lg bg-muted" />}>
        <SpendingByCategory data={categoryData} />
      </Suspense>
    </div>
  );
}
```

**Avoid unnecessary re-renders in lists:**

```typescript
// components/features/transactions/transaction-row.tsx
"use client";

import { memo } from "react";
import type { Transaction } from "@/types/transactions";

export const TransactionRow = memo(function TransactionRow({
  transaction,
  onSelect,
}: {
  transaction: Transaction;
  onSelect: (id: string) => void;
}) {
  return (
    <tr
      className="border-b border-border hover:bg-muted/50 cursor-pointer"
      onClick={() => onSelect(transaction.id)}
    >
      <td className="p-card text-sm">{transaction.description}</td>
      <td className="p-card text-sm">{transaction.category}</td>
      <td className={`p-card text-sm font-medium ${transaction.amount < 0 ? "text-expense" : "text-income"}`}>
        {transaction.amount < 0 ? "-" : "+"}${Math.abs(transaction.amount).toFixed(2)}
      </td>
      <td className="p-card text-sm text-muted-foreground">{transaction.date}</td>
    </tr>
  );
});
```

**Use `React.memo` only on:**
- List items rendered in loops (transaction rows, message bubbles)
- Components receiving stable props from a parent that re-renders often
- Never on components that already receive new props every render (memo would be wasted)

**Parallel data fetching on the server:**

```typescript
// Always use Promise.all for independent queries
const [transactions, budgets, accountBalance] = await Promise.all([
  supabase.from("transactions").select("*").order("date", { ascending: false }).limit(50),
  supabase.from("budgets").select("*").eq("month", currentMonth),
  supabase.from("accounts").select("balance").single(),
]);
```

**Image optimization:**

```typescript
// Always use next/image, never <img>
import Image from "next/image";

<Image
  src="/logo.png"
  alt="Finance Tracker"
  width={120}
  height={32}
  priority // Only for above-the-fold images
/>
```

**Performance checklist:**

- [ ] Server Components for all data fetching (no client-side waterfalls)
- [ ] `dynamic()` with `{ ssr: false }` for chart components
- [ ] `React.memo` on transaction rows and chat message bubbles
- [ ] `Promise.all` for parallel server-side queries
- [ ] `next/image` for all images with proper `width`/`height`
- [ ] No `useEffect` for data fetching — use Server Components or SWR
- [ ] Bundle analyzer checked: `npx @next/bundle-analyzer` (should be < 150KB first load JS)
- [ ] Supabase queries use `.select("col1, col2")` instead of `.select("*")` in production

---

## Package Versions (as of early 2026)

```json
{
  "next": "^14.2",
  "react": "^18.3",
  "typescript": "^5.4",
  "@supabase/supabase-js": "^2.45",
  "@supabase/ssr": "^0.5",
  "@anthropic-ai/sdk": "^0.30",
  "zustand": "^5.0",
  "recharts": "^2.13",
  "zod": "^3.23",
  "swr": "^2.2",
  "next-themes": "^0.4",
  "tailwindcss": "^3.4",
  "tailwindcss-animate": "^1.0",
  "clsx": "^2.1",
  "tailwind-merge": "^2.5",
  "lucide-react": "^0.450"
}
```

---

## Sources

- [Next.js App Router Project Structure](https://nextjs.org/docs/app/getting-started/project-structure)
- [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Next.js Error Handling](https://nextjs.org/docs/app/getting-started/error-handling)
- [Next.js Lazy Loading Guide](https://nextjs.org/docs/app/guides/lazy-loading)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase with Next.js Tutorial](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs)
- [Supabase Security Best Practices 2026](https://supaexplorer.com/guides/supabase-security-best-practices)
- [Tailwind CSS Dark Mode](https://tailwindcss.com/docs/dark-mode)
- [Tailwind CSS Theme Variables](https://tailwindcss.com/docs/theme)
- [Dark Mode with Design Tokens in Tailwind](https://www.richinfante.com/2024/10/21/tailwind-dark-mode-design-tokens-themes-css)
- [Shadcn/UI Charts](https://www.shadcn.io/charts)
- [Tremor Dashboard Components](https://www.tremor.so/)
- [React State Management in 2025: Context vs Zustand](https://dev.to/cristiansifuentes/react-state-management-in-2025-context-api-vs-zustand-385m)
- [Next.js 14+ Performance Optimization](https://dev.to/hijazi313/nextjs-14-performance-optimization-modern-approaches-for-production-applications-3n65)
- [Next.js Streaming Guide](https://dev.to/boopykiki/a-complete-nextjs-streaming-guide-loadingtsx-suspense-and-performance-9g9)
- [Next.js + Supabase Production Lessons](https://catjam.fi/articles/next-supabase-what-do-differently)
- [Battle-Tested NextJS Project Structure 2025](https://medium.com/@burpdeepak96/the-battle-tested-nextjs-project-structure-i-use-in-2025-f84c4eb5f426)
