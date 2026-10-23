# 12 — Architecture and Maintainability (A1)

## Scope / Method / Verified vs read
Layering, duplication, dead code, TODO inventory, file sizes, dependency usage, docs, conventions. Method: `git ls-files` + `wc -l` over 632 tracked app/lib/components/store files, grep of imports versus package.json. Structure and ARC-001..005 are in 01-repository-and-architecture.md.

## Summary table
| ID | Sev | Conf | Title | Component |
|---|---|---|---|---|
| MNT-001 | P3 | High | Oversized modules (lib/api.js 2,181 lines, lib/fees.js 1,728) | lib |
| MNT-002 | P3 | High | README is create-next-app boilerplate; no env/deploy/runbook docs | docs |
| MNT-003 | P3 | Medium | `xlsx` installed from vendor CDN tarball, not npm | dependencies |
| MNT-004 | P3 | Medium | Process-local `globalThis`/Map state | lib |
| MNT-005 | P4 | High | Convention notes: deprecated middleware file, raw img tags | framework |

## Inventory
- **Size:** 632 tracked js/jsx files in app, lib, components, store; 74 lib modules; 33 API groups. Largest: lib/api.js 2181, lib/fees.js 1728, components/academics/TimeTableClient.jsx 1023, lib/students.js 953, lib/studentSeedData.js 816, settings/RolesPermissionsExplorer.jsx 739, students/StudentForm.jsx 737. Mobile screens up to 1,061 lines (MOB-012).
- **TODO/FIXME/HACK:** 0 in app, lib, components, store, prisma. Positive, but it also means known gaps (e.g. the missing webhook, ARC-002) are not tracked in code.
- **Dead code:** `GeneratedReportJob` model, seed-data libs and 8 components (ARC-005); `lib/studentSeedData.js` (816 lines) is the largest.
- **Dependencies:** all 16 runtime deps are imported in source (react-icons 229 files, react-hook-form 33, zod 1, pusher 1, etc.). No unused runtime dep found. Versions are current (Next 16.3.2, React 19.2.8, Prisma 6.19.3). `npm audit` not run in this pass.
- **Layering:** pages and route handlers call `lib/*`, which calls Prisma (`lib/db.js`, single client cached on globalThis, standard pattern). Client fetching goes through `lib/api.js`, a 2,181-line facade. Permission logic in `lib/auth`. Reasonable layering; the weak spot is the two giant lib files.
- **Convention consistency:** `loading.jsx` skeletons only in redesigned areas; no `error.jsx` (ARC-004); `middleware.js` instead of Next 16 `proxy` (ARC-003); lint violations in 09.

## Findings
### MNT-001 — Oversized modules
- **Category:** Other
- **Severity:** P3   **Confidence:** High   **Status:** Confirmed
- **Affected component:** lib/api.js, lib/fees.js, TimeTableClient
- **Evidence:** `lib/api.js` (2,181 lines), `lib/fees.js` (1,728), `components/academics/TimeTableClient.jsx` (1,023)
- **Impact:** merge conflicts, slow review, and the fee logic that handles money is hard to unit test.
- **Reproduction / verification:** `wc -l`
- **Root cause:** organic growth
- **Recommended fix:** split lib/api.js per domain, re-exporting from the same path; extract pure fee calculators from lib/fees.js first (also enables TST-001).
- **Validation:** imports unchanged; lint and build pass
- **Effort:** M   **Dependencies:** TST-001

### MNT-002 — Documentation gaps
- **Category:** Other
- **Severity:** P3   **Confidence:** High   **Status:** Confirmed
- **Affected component:** docs
- **Evidence:** `README.md` (36 lines, create-next-app text); no `.env.example`; only `docs/API-Spec.md`; no architecture, runbook or migration doc; mobile repo has overlapping docs (README_COMPLETE, SETUP, QUICK_START, PROJECT_SETUP_SUMMARY, TEST_FIX) that may be stale
- **Impact:** onboarding and incident response depend on one person's memory.
- **Reproduction / verification:** file listing
- **Root cause:** docs not maintained
- **Recommended fix:** replace README with setup, env var names, deploy and migration steps and the cron list; prune mobile docs.
- **Validation:** a new developer can run the app from the README alone
- **Effort:** S   **Dependencies:** OPS-003

### MNT-003 — xlsx from vendor CDN tarball
- **Category:** Other
- **Severity:** P3   **Confidence:** Medium   **Status:** Confirmed
- **Affected component:** bulk import/export
- **Evidence:** `package.json:30`, `package-lock.json:8099`; imported in 6 files
- **Impact:** SheetJS no longer publishes to npm, so installs depend on cdn.sheetjs.com and `npm audit` cannot track it. It is the correct source for 0.20.x, so this is a trade-off; the library parses user-uploaded files.
- **Reproduction / verification:** code-based
- **Root cause:** vendor distribution
- **Recommended fix:** keep it, cache the tarball in CI, keep upload size caps.
- **Validation:** `npm ci` works from cache
- **Effort:** S   **Dependencies:** TST-001

### MNT-004 — Process-local state
- **Category:** Backend
- **Severity:** P3   **Confidence:** Medium   **Status:** Suspected
- **Affected component:** lib
- **Evidence:** `lib/db.js:3-6` (acceptable Prisma pattern; its comment says it matches "the rest of this codebase's in-memory stores"); `lib/auth/loginRateLimit.js:23`
- **Impact:** state kept on `globalThis` or a module Map is shared across requests within an instance and absent across instances. The prior-audit tenant-context claim is reconciled in 14-prior-audit-reconciliation.md.
- **Reproduction / verification:** code-based; not exhaustively enumerated
- **Root cause:** serverless semantics not accounted for
- **Recommended fix:** keep globalThis only for the Prisma client; move other state to the DB.
- **Validation:** grep `globalThis` shows only lib/db.js
- **Effort:** M   **Dependencies:** OPS-006

### MNT-005 — Convention notes
- **Category:** Frontend
- **Severity:** P4   **Confidence:** High   **Status:** Confirmed
- **Affected component:** framework conventions
- **Evidence:** ARC-003, ARC-004; 18 raw `<img>` uses (lint warning)
- **Impact:** minor; flagged for completeness.
- **Reproduction / verification:** lint output
- **Root cause:** see referenced IDs
- **Recommended fix:** see referenced IDs
- **Validation:** lint
- **Effort:** S   **Dependencies:** ARC-003, ARC-004

## Positive observations
- No unused runtime dependencies; no TODO debris; consistent `lib/` domain modules; encryption helper isolated; single Prisma client.

## Limitations / not assessed
No CVE or license scan, no complexity metrics, no duplication tool (jscpd); duplication judged from file sizes and prior reports; most of the 632 files were not read in full.
