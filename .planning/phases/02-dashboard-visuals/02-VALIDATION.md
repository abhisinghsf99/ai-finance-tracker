---
phase: 2
slug: dashboard-visuals
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-11
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x + @testing-library/react 16.x |
| **Config file** | `fintrack-dashboard/vitest.config.ts` |
| **Quick run command** | `cd fintrack-dashboard && npm test` |
| **Full suite command** | `cd fintrack-dashboard && npm test && npm run build` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd fintrack-dashboard && npm test`
- **After every plan wave:** Run `cd fintrack-dashboard && npm test && npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | DASH-01 | unit | `npx vitest run src/__tests__/summary-cards.test.tsx` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | DASH-02 | unit | `npx vitest run src/__tests__/account-cards.test.tsx` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | DASH-03 | unit | `npx vitest run src/__tests__/net-position.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-04 | 01 | 1 | DASH-04 | unit | `npx vitest run src/__tests__/credit-utilization.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 2 | CHRT-01 | unit | `npx vitest run src/__tests__/spending-chart.test.tsx` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 2 | CHRT-02 | unit | `npx vitest run src/__tests__/category-chart.test.tsx` | ❌ W0 | ⬜ pending |
| 02-02-03 | 02 | 2 | CHRT-03 | unit | `npx vitest run src/__tests__/category-drilldown.test.tsx` | ❌ W0 | ⬜ pending |
| 02-02-04 | 02 | 2 | CHRT-04 | unit | `npx vitest run src/__tests__/chart-colors.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/summary-cards.test.tsx` — stubs for DASH-01
- [ ] `src/__tests__/account-cards.test.tsx` — stubs for DASH-02
- [ ] `src/__tests__/net-position.test.ts` — stubs for DASH-03
- [ ] `src/__tests__/credit-utilization.test.ts` — stubs for DASH-04
- [ ] `src/__tests__/spending-chart.test.tsx` — stubs for CHRT-01
- [ ] `src/__tests__/category-chart.test.tsx` — stubs for CHRT-02, CHRT-03
- [ ] `src/__tests__/chart-colors.test.ts` — stubs for CHRT-04

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Chart hover tooltips show exact amounts | CHRT-01 | Recharts tooltips need real browser hover events | Hover over each bar, verify tooltip shows month + dollar amount |
| Donut chart segment click triggers drill-down | CHRT-03 | Click events on SVG elements need real browser | Click a donut segment, verify transaction panel opens with filtered results |
| Mobile chart readability | CHRT-01, CHRT-02 | Responsive chart sizing needs visual verification | View at 375px width, verify charts are readable and labels don't overlap |
| Credit utilization bar colors match thresholds | DASH-04 | CSS color rendering needs visual verification | Verify green (<30%), amber (30-70%), red (>70%) are visually correct |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
