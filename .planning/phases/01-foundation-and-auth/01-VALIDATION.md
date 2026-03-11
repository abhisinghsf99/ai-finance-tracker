---
phase: 1
slug: foundation-and-auth
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
| **Framework** | Vitest 3.x (Next.js 15 + React 19 compatible) |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run && npm run build` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run && npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green + manual FOUND-03 check
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | FOUND-01 | smoke | `npm run build` | N/A | ⬜ pending |
| 01-01-02 | 01 | 1 | FOUND-02 | unit | `npx vitest run src/__tests__/middleware.test.ts` | ❌ W0 | ⬜ pending |
| 01-01-03 | 01 | 1 | FOUND-02 | unit | `npx vitest run src/__tests__/auth-api.test.ts` | ❌ W0 | ⬜ pending |
| 01-01-04 | 01 | 1 | FOUND-03 | manual | Inspect browser network tab / source map | N/A | ⬜ pending |
| 01-02-01 | 02 | 1 | FOUND-04 | unit | `npx vitest run src/__tests__/sidebar.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-02 | 02 | 1 | FOUND-05 | unit | `npx vitest run src/__tests__/theme-toggle.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — Vitest configuration with React Testing Library setup
- [ ] `src/__tests__/middleware.test.ts` — stubs for FOUND-02 (redirect behavior)
- [ ] `src/__tests__/auth-api.test.ts` — stubs for FOUND-02 (password validation)
- [ ] `src/__tests__/sidebar.test.ts` — stubs for FOUND-04 (navigation items)
- [ ] `src/__tests__/theme-toggle.test.ts` — stubs for FOUND-05 (theme switching)
- [ ] Framework install: `npm install -D vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react jsdom`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Service role key not in client bundle | FOUND-03 | Requires running browser and inspecting devtools network tab / JS source maps — not automatable with unit tests | 1. Open browser devtools 2. Navigate to any page 3. Search Network tab for service_role key value 4. Search Sources tab for key value 5. Confirm neither appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
