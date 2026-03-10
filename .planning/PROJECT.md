# FinTrack — Frontend Dashboard

## What This Is

A personal fintech dashboard web app that visualizes spending data from an existing Plaid-powered backend. Four pages — Dashboard (overview with charts), Transactions (browsable/filterable list), Recurring (auto-detected subscriptions), and Chat (natural language financial queries via Claude + MCP). Deployed to Vercel, accessible from any device, dark/light themed.

## Core Value

At-a-glance financial visibility — see balances, spending trends, and category breakdowns without asking Claude a question every time.

## Requirements

### Validated

- ✓ Bank account linking via Plaid — existing (`link-account/`)
- ✓ Real-time transaction sync via webhooks — existing (`webhook/`)
- ✓ MCP server with execute_query + get_schema — existing (`mcp-server/`)
- ✓ Supabase database with institutions, accounts, transactions, sync_log tables — existing
- ✓ Webhook signature verification (JWT + SHA-256) — existing
- ✓ Cursor-based pagination for transaction sync — existing

### Active

- [ ] Visual dashboard with summary cards, account balances, spending charts
- [ ] Transaction browser with search, filters, sorting, pagination
- [ ] Recurring charge detection and display
- [ ] Chat interface powered by Anthropic API + remote MCP server
- [ ] Dark/light theme toggle (dark default)
- [ ] Auth gate to protect financial data
- [ ] Vercel deployment with environment variables

### Out of Scope

- Multi-user support — personal app, single user
- Plaid Link in frontend — bank connections managed separately via existing link-account flow
- Investment or retirement account tracking — consumer credit, lending, checking/savings only
- Budget setting or goal tracking — potential Phase 3
- Native mobile app — PWA covers mobile access
- Phase 2 features (push notifications, anomaly detection, category management) — documented in project plan Section 11

## Context

**Existing backend:** Fully operational Plaid → VPS webhook → Supabase pipeline. MCP server deployed at claudefinancetracker.xyz/mcp (authless, read-only). Currently connected: 1 institution (US Bank) with 2 checking accounts, 2 credit cards, 1 auto loan.

**Data model:** 4 tables — institutions, accounts, transactions, sync_log. Transactions have Plaid categories (category_primary, category_detailed), merchant info, amounts (positive = spending, negative = income/refunds per Plaid convention), and raw_data JSONB for future-proofing.

**Frontend reads from Supabase directly** for dashboard/transactions/recurring pages. Chat goes through /api/chat → Anthropic API → remote MCP server → Supabase.

**Design direction:** Clean, modern fintech aesthetic inspired by Copilot, Linear, Arc. Sidebar navigation + main content area. Distinctive typography. Muted chart palette with clear data hierarchy. Design system via UI UX Pro Max skill, screen mockups via Google Stitch MCP.

## Constraints

- **Tech stack**: Next.js 14 (App Router), TypeScript, Tailwind CSS + shadcn/ui, Recharts, supabase-js, Anthropic SDK — decided in project plan
- **Deployment**: Vercel free tier — must work within limits
- **Database access**: Read-only from frontend; RLS policies needed for anon key access on accounts/transactions tables (or server-side API routes with service_role key)
- **Auth**: TBD approach — options: simple password gate, NextAuth with single email, or Vercel password protection
- **Cost**: Minimal — Supabase free tier, Vercel free tier, Anthropic API pay-per-use
- **Design tooling**: Stitch MCP + UI UX Pro Max skill + Nano Banana 2 for screen design

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js 14 App Router | Vercel-native, server components, API routes built in | — Pending |
| supabase-js direct reads | Already have the project, simplest path for read-only dashboard data | — Pending |
| Anthropic SDK for chat (not MCP client) | Server-side API route, Claude calls MCP tools internally | — Pending |
| Recharts for charts | Clean API, good financial chart defaults, React-native | — Pending |
| shadcn/ui components | Accessible, customizable, Tailwind-native | — Pending |
| Dark theme default | Fintech dashboard convention, easier on eyes for financial data | — Pending |
| Auth approach | TBD — needs discussion during phase planning | — Pending |
| RLS vs server-side routes | TBD — security vs simplicity tradeoff | — Pending |

---
*Last updated: 2025-03-10 after initialization*
