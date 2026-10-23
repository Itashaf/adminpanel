# 09 — Testing and QA (A1)

## Scope / Method / Verified vs read
ADMIN and MOBILE test inventory, lint baseline, coverage gaps. Method: package.json scripts, `git ls-files`, glob for test files, `npx eslint .` (JSON output to scratchpad; no --fix). Verified by execution: ESLint only. Everything else is code/inventory-based.

## Summary table
| ID | Sev | Conf | Title | Component |
|---|---|---|---|---|
| TST-001 | P1 | High | No automated tests of any kind in ADMIN (no runner, no `test` script) | whole repo |
| TST-002 | P2 | High | MOBILE has jest configured but zero app tests; toolchain version mismatch | schoolapp360 |
| TST-003 | P2 | High | ESLint baseline red: 97 errors / 35 warnings | components |
| TST-004 | P3 | High | Ad-hoc DB-mutating scripts tracked at repo root instead of tests/fixtures | repo root |

## Inventory
- ADMIN `package.json` scripts: `dev`, `build` (`prisma generate && next build`), `start`, `lint` (`eslint`), `db:seed`. No `test`. No jest/vitest/playwright in deps. The only `*.test.*`/`tests/` files tracked are under `.claude/skills` and `.agents/skills` (tooling for AI skills, not the app); `app/api/performance/tests/**` is the "subject tests" (exam) feature, not tests.
- MOBILE scripts: `test`, `test:watch`, `test:coverage`, `lint` (eslint src). `jest.config.js` (preset react-native, babel-jest, testMatch `__tests__`/`*.test.*`), `jest.setup.js` mocks splash/constants. Dev deps: jest ~29.7, babel-jest ^30.5, @testing-library/react-native. No test files under `src/` (only skill tests under `.claude/`/`.agents/`, which `testMatch` would pick up). See MOB-007.

## Commands run
| Command | Exit | Key output |
|---|---|---|
| `npx eslint . -f json` (ADMIN) | 1 | 710 files; 97 errors, 35 warnings |
| MOBILE `npx jest` | Not run | no app tests exist; only AI-skill tests match, which say nothing about the app |
| ADMIN tests | Not run | none exist |
| `next build`, migrations, seed, root `_*.mjs` | Not run | forbidden by audit rules |

### ESLint by rule
Errors: `react-hooks/set-state-in-effect` 47, `react/no-unescaped-entities` 42, `react-hooks/purity` 4, `@next/next/no-html-link-for-pages` 2, `react-hooks/immutability` 1, `react-hooks/preserve-manual-memoization` 1. Warnings: `@next/next/no-img-element` 18, `react-hooks/incompatible-library` 13 (react-hook-form `watch`), `no-location-assign-relative-destination` 1, 3 with null rule id. Top files (all issues): components/students/BulkImportModal.jsx 5, students/SetPortalAccessDialog.jsx 5, classes/ClassFormModal.jsx 4, fees/GenerateFeesModal.jsx 4, superadmin/AdminPermissionsModal.jsx 4, academics/TimeTableClient.jsx 3, exams/ExamResultsClient.jsx 3, marksEntry/MarksEntryClient.jsx 3. Related: FE-003 (a2 recorded 55 errors earlier; the tree has moved, current count is 97).

## Findings
### TST-001 — No automated tests in ADMIN
- **Category:** Other
- **Severity:** P1   **Confidence:** High   **Status:** Confirmed
- **Affected component:** all critical workflows
- **Evidence:** `package.json:5-11` (no test script), `package.json:13-45` (no test framework); `git ls-files` shows no app test files
- **Impact:** ~180 route handlers incl. money, auth and tenant scoping have no regression net; every refactor (about 100 modified files in the tree) is unverified.
- **Reproduction / verification:** code-based; inventory
- **Root cause:** tests never introduced
- **Recommended fix:** add `node --test` (built in, no new dependency) or vitest; start with pure-function tests (fee calc in lib/fees.js, JWT/permission helpers, encryption round trip, Razorpay signature check) and a few route-level auth tests against a throwaway Postgres schema.
- **Validation:** `npm test` green in CI
- **Effort:** L   **Dependencies:** OPS-001

### TST-002 — MOBILE: jest configured, zero app tests, version mismatch
- **Category:** Mobile
- **Severity:** P2   **Confidence:** High   **Status:** Confirmed
- **Affected component:** schoolapp360 testing
- **Evidence:** schoolapp360 `package.json` (jest ~29.7 with babel-jest ^30.5), `jest.config.js` testMatch; no `*.test.*` in `src/`
- **Impact:** `npm test` finds nothing app-related; mismatched majors may fail on the first real test; testMatch is not scoped to `src/`, so skill tests under `.claude/` would run.
- **Reproduction / verification:** code-based; not executed
- **Root cause:** scaffolding without tests
- **Recommended fix:** align babel-jest to 29, add `roots: ['<rootDir>/src']`, add tests for the auth slice, baseApi retry/401, date/fee utils.
- **Validation:** `npm test` runs more than 0 tests
- **Effort:** M   **Dependencies:** MOB-007, MOB-003

### TST-003 — ESLint baseline red (97 errors / 35 warnings)
- **Category:** Frontend
- **Severity:** P2   **Confidence:** High   **Status:** Confirmed
- **Affected component:** components
- **Evidence:** `npx eslint .` exit 1; rule counts above; `eslint.config.mjs:1-16` extends only next core-web-vitals
- **Impact:** lint cannot gate CI; real hook-purity/state-in-effect issues are buried; 42 trivial unescaped-entity errors.
- **Reproduction / verification:** ran `npx eslint .` (no fix)
- **Root cause:** lint never enforced
- **Recommended fix:** fix `no-unescaped-entities` (mechanical), triage `set-state-in-effect`, then enforce lint in CI.
- **Validation:** `npm run lint` exit 0
- **Effort:** M   **Dependencies:** FE-003, OPS-001

### TST-004 — Ad-hoc DB scripts at repo root, tracked
- **Category:** DevOps
- **Severity:** P3   **Confidence:** High   **Status:** Confirmed
- **Affected component:** repo root
- **Evidence:** tracked: `_reset_demo.mjs`, `_check_annual.mjs`, `_check_new_exam.mjs`, `_simulate_visible_exams.mjs`
- **Impact:** not tests; `_reset_demo.mjs` mutates data against whatever `.env` points to, so an accidental run on a prod DB is plausible. Not executed here.
- **Reproduction / verification:** code-based; not executed
- **Root cause:** dev scratch scripts committed
- **Recommended fix:** move under `scripts/dev-only/`, guard with a localhost-host check, or delete.
- **Validation:** script exits when the DATABASE_URL host is not local
- **Effort:** S   **Dependencies:** OPS-005

## Coverage gaps per critical workflow (ADMIN and MOBILE: no automated tests for any)
| Workflow | Existing tests | Gap / suggested first test |
|---|---|---|
| Auth (login, JWT, parent login, rate limit) | none | JWT sign/verify/expiry; login rate limit; parent login |
| Authorization (permissions, roles) | none | table test of permission helper per role; each route returns 401/403 unauthenticated |
| Tenant isolation | none | two-school fixture: cross-school id access must 404 (highest value) |
| Fees / payments / Razorpay | none | fee calc, verify signature, idempotent double-verify; no webhook exists (ARC-002) |
| Attendance | none | duplicate marking, trend SQL vs fixture |
| Exams / marks | none | marks bounds, publish visibility rules |
| Parent portal | none | parent sees only own children |
| Bulk import | none | malformed/oversized xlsx; duplicate admission numbers |
| Migrations | none | fresh-DB `migrate deploy` + `migrate diff` in CI |
| Mobile | none | see TST-002 |

## Positive observations
- Mobile has working jest/RTL scaffolding to build on; ADMIN has `docs/API-Spec.md` (1,175 lines) usable to derive contract tests.

## Limitations / not assessed
No test execution (none exist); no coverage numbers; no e2e, browser, accessibility or load testing; manual QA process not assessed.
