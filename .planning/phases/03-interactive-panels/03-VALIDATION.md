---
phase: 3
slug: interactive-panels
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-11
---

# Phase 3 — Validation Strategy

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
| 03-01-01 | 01 | 1 | TXNS-01 | unit | `npx vitest run src/__tests__/transactions-panel.test.tsx` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | TXNS-02 | unit | `npx vitest run src/__tests__/transaction-row.test.tsx` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | TXNS-03 | unit | `npx vitest run src/__tests__/transactions-panel.test.tsx` | ❌ W0 | ⬜ pending |
| 03-01-04 | 01 | 1 | TXNS-04 | unit | `npx vitest run src/__tests__/transaction-filters.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-05 | 01 | 1 | TXNS-05 | unit | `npx vitest run src/__tests__/transaction-filters.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | RECR-01 | unit | `npx vitest run src/__tests__/recurring-panel.test.tsx` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 2 | RECR-02 | unit | `npx vitest run src/__tests__/recurring-panel.test.tsx` | ❌ W0 | ⬜ pending |
| 03-02-03 | 02 | 2 | RECR-03 | unit | `npx vitest run src/__tests__/recurring-detection.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/transactions-panel.test.tsx` — stubs for TXNS-01, TXNS-03
- [ ] `src/__tests__/transaction-row.test.tsx` — stubs for TXNS-02
- [ ] `src/__tests__/transaction-filters.test.ts` — stubs for TXNS-04, TXNS-05
- [ ] `src/__tests__/recurring-panel.test.tsx` — stubs for RECR-01, RECR-02
- [ ] `src/__tests__/recurring-detection.test.ts` — stubs for RECR-03

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Collapsible expand/collapse animation | TXNS-01, RECR-01 | CSS animation timing needs visual verification | Click panel header, verify smooth expand/collapse with chevron rotation |
| Filter popover positioning on mobile | TXNS-04 | Viewport collision handling needs real browser | Open filter popover at 375px width, verify it doesn't overflow |
| Debounced search responsiveness | TXNS-03 | Perceived latency needs user testing | Type in search bar, verify results update smoothly after ~300ms |
| Category badge color rendering | TXNS-02 | Color accuracy needs visual verification | Verify category badges use correct chart-colors.ts colors |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
