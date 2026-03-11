---
phase: 1
slug: foundation-and-layout
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 + @testing-library/react 16.3.2 |
| **Config file** | `fintrack-dashboard/vitest.config.ts` |
| **Quick run command** | `cd fintrack-dashboard && npm test` |
| **Full suite command** | `cd fintrack-dashboard && npm test && npm run build` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd fintrack-dashboard && npm test`
- **After every plan wave:** Run `cd fintrack-dashboard && npm test && npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | FOUND-01 | smoke | `cd fintrack-dashboard && npm run build` | N/A | ⬜ pending |
| 01-01-02 | 01 | 1 | FOUND-02 | unit | `npx vitest run src/__tests__/auth-api.test.ts` | Partial (needs sign-out) | ⬜ pending |
| 01-01-03 | 01 | 1 | FOUND-03 | unit | `npx vitest run src/__tests__/supabase-security.test.ts` | ❌ W0 | ⬜ pending |
| 01-01-04 | 01 | 1 | FOUND-04 | unit | `npx vitest run src/__tests__/plaid-amounts.test.ts` | ❌ W0 | ⬜ pending |
| 01-01-05 | 01 | 1 | FOUND-05 | unit | `npx vitest run src/__tests__/layout.test.tsx` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | LAYO-01 | unit | `npx vitest run src/__tests__/top-nav.test.tsx` | ❌ W0 | ⬜ pending |
| 01-02-02 | 02 | 1 | LAYO-02 | unit | Covered by layout test | ❌ W0 | ⬜ pending |
| 01-02-03 | 02 | 1 | LAYO-03 | unit | `npx vitest run src/__tests__/mobile-nav.test.tsx` | Partial (needs anchor links) | ⬜ pending |
| 01-03-01 | 03 | 1 | LAYO-04 | manual | Verify URL loads in browser | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/auth-api.test.ts` — UPDATE: add sign-out (DELETE) tests for FOUND-02
- [ ] `src/__tests__/supabase-security.test.ts` — stubs for FOUND-03
- [ ] `src/__tests__/plaid-amounts.test.ts` — stubs for FOUND-04
- [ ] `src/__tests__/layout.test.tsx` — stubs for FOUND-05 (dark class, no theme toggle)
- [ ] `src/__tests__/top-nav.test.tsx` — stubs for LAYO-01
- [ ] `src/__tests__/mobile-nav.test.tsx` — UPDATE: anchor links instead of route links for LAYO-03
- [ ] DELETE `src/__tests__/sidebar.test.tsx` — sidebar being removed
- [ ] DELETE `src/__tests__/theme-toggle.test.tsx` — theme toggle being removed

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Vercel deployment loads correctly | LAYO-04 | Requires live deployment verification | Visit Vercel URL, confirm login page loads, env vars work |
| 30-day session persists | FOUND-02 | Cookie persistence requires real browser | Login, check cookie expiry in dev tools |
| Dark theme visual consistency | FOUND-05 | CSS variable theming needs visual check | Verify teal/cyan accent, Satoshi font, no light mode artifacts |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
