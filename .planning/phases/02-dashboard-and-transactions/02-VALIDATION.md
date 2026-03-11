---
phase: 2
slug: dashboard-and-transactions
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (already installed from Phase 1) |
| **Config file** | `fintrack-dashboard/vitest.config.ts` |
| **Quick run command** | `cd fintrack-dashboard && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd fintrack-dashboard && npx vitest run && npm run build` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd fintrack-dashboard && npx vitest run --reporter=verbose`
- **After every plan wave:** Run `cd fintrack-dashboard && npx vitest run && npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | DASH-01 | unit | `npx vitest run src/__tests__/account-card.test.tsx` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | DASH-02 | unit | `npx vitest run src/__tests__/net-position.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | DASH-03 | unit | `npx vitest run src/__tests__/credit-utilization.test.tsx` | ❌ W0 | ⬜ pending |
| 02-01-04 | 01 | 1 | DASH-04 | unit | `npx vitest run src/__tests__/category-chart.test.tsx` | ❌ W0 | ⬜ pending |
| 02-01-05 | 01 | 1 | DASH-05 | unit | `npx vitest run src/__tests__/recent-transactions.test.tsx` | ❌ W0 | ⬜ pending |
| 02-01-06 | 01 | 1 | DASH-06 | unit | `npx vitest run src/__tests__/flags.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | TXNS-01 | unit | `npx vitest run src/__tests__/transaction-queries.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | TXNS-02 | unit | `npx vitest run src/__tests__/filter-panel.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/account-card.test.tsx` — stubs for DASH-01
- [ ] `src/__tests__/net-position.test.ts` — stubs for DASH-02
- [ ] `src/__tests__/credit-utilization.test.tsx` — stubs for DASH-03
- [ ] `src/__tests__/category-chart.test.tsx` — stubs for DASH-04
- [ ] `src/__tests__/recent-transactions.test.tsx` — stubs for DASH-05
- [ ] `src/__tests__/flags.test.ts` — stubs for DASH-06
- [ ] `src/__tests__/transaction-queries.test.ts` — stubs for TXNS-01, TXNS-02
- [ ] `src/__tests__/filter-panel.test.tsx` — stubs for TXNS-02

*Existing infrastructure covers test framework — only test file stubs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Donut chart renders visually correct | DASH-04 | Chart rendering requires visual inspection | Open dashboard, verify donut chart shows category slices with correct colors and tooltips |
| Dark/light theme chart colors | DASH-04 | CSS variable theming needs visual check | Toggle theme, verify chart colors update correctly |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
