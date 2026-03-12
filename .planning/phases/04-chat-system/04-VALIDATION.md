---
phase: 4
slug: chat-system
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-11
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 + @testing-library/react 16.3.2 |
| **Config file** | `fintrack-dashboard/vitest.config.ts` |
| **Quick run command** | `cd fintrack-dashboard && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd fintrack-dashboard && npx vitest run --reporter=verbose && npm run build` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd fintrack-dashboard && npx vitest run --reporter=verbose`
- **After every plan wave:** Run `cd fintrack-dashboard && npx vitest run --reporter=verbose && npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | CHAT-04 | unit | `npx vitest run src/__tests__/chat-api.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | CHAT-05 | unit | `npx vitest run src/__tests__/chat-config.test.ts` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 2 | CHAT-01 | unit | `npx vitest run src/__tests__/chat-fab.test.tsx` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 2 | CHAT-02 | unit | `npx vitest run src/__tests__/chat-message.test.tsx` | ❌ W0 | ⬜ pending |
| 04-02-03 | 02 | 2 | CHAT-03 | unit | `npx vitest run src/__tests__/suggestion-chips.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/chat-api.test.ts` — stubs for CHAT-04
- [ ] `src/__tests__/chat-config.test.ts` — stubs for CHAT-05 (system prompt validation)
- [ ] `src/__tests__/chat-fab.test.tsx` — stubs for CHAT-01
- [ ] `src/__tests__/chat-message.test.tsx` — stubs for CHAT-02
- [ ] `src/__tests__/suggestion-chips.test.tsx` — stubs for CHAT-03

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Claude returns factual markdown with TL;DR + table format | CHAT-05 | Requires live Anthropic API + MCP server | Send "Show my grocery spending this month", verify response starts with summary and includes markdown table |
| Streaming tokens appear progressively | CHAT-02 | SSE streaming needs real API connection | Send a query, verify tokens appear word-by-word, not all at once |
| MCP tool calls execute SQL successfully | CHAT-04, CHAT-05 | Requires live MCP server at claudefinancetracker.xyz | Send a data query, verify response contains real transaction data |
| Full-screen chat transition from FAB | CHAT-01 | Animation smoothness needs visual verification | Tap FAB, verify smooth transition to full-screen chat view |
| Chat works on Vercel without timeout | CHAT-04 | Requires deployed environment | Deploy to Vercel, send a query, verify response completes within timeout |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
