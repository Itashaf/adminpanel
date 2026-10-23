# 14 — Prior audit reconciliation (ADMIN/AUDIT_REPORT.md + ISSUE_CHECKLIST.md vs CURRENT code)

Auditor: A6. Read-only. Prior audit score: 42/100, verdict "NOT READY". Every row below was re-checked by re-opening the cited file in the current working tree (code-based; nothing was executed against the app, no POST/mutating request was sent). Line numbers are current-tree lines.

## Counts

Total rows: 67 (51 checklist items + 16 additional report claims). FIXED: 24 | PARTIALLY FIXED: 7 | UNVERIFIABLE: 7 | STILL OPEN: 29.

## Headline answers

- **Claimed unauthenticated mutating routes (checklist items 2-11, report section 3/4):** all 16 route files / methods named were re-opened. **Every one now begins with a guard** (`requirePermission(...)` or `requireSuperAdmin()`); none is unauthenticated. See rows P2-P11. This verifies guard presence only, not that each permission key is the right one.
- **Hardcoded SuperAdmin password shown on the login page:** `components/SuperAdminLoginForm.jsx` no longer renders any credentials box (re-read lines 1-30 and grep for credential literals: only a code comment about bad credentials). `prisma/seed.js:85-92` now takes the SuperAdmin password from an env var or generates a random one. **FIXED.** Residual: a stale code comment in `lib/auth.js:5-7` still states the old demo credential pair in plain text (documentation leak, not a live credential check); `prisma/seed.js:112-113` still seeds two demo SchoolAdmin accounts with a literal shared password (see P42).
- **`globalThis` tenant singleton:** `lib/currentUser.js:12` and `lib/school.js:17` still exist. Authorization no longer depends on them for the routes the prior audit named (they now use `requirePermission`), but `getCurrentUser()` is still imported as a fallback by attendance and the performance routes, `setCurrentRole` is still called at login (`app/actions/auth.js:92,111,138`) and `lib/auth/schoolContext.js:26` still falls back to the singleton when there is no session (this is what makes the fee cron single-school, see OBS-003). **PARTIALLY FIXED.**
- **Methodology note:** the prior report claimed `Payment`/`StudentFee` use `onDelete: Cascade` from `Student` in one place and `Restrict` in another; the current schema uses Restrict (no `onDelete`) on both (`prisma/schema.prisma:542`, and Payment at 1432) with an explicit friendly error in `lib/students.js:686-690`. The "500 on delete" crash is fixed; the cascade contradiction in the prior text was inaccurate.

## A. ISSUE_CHECKLIST.md items (51)

| # | Prior finding | Claimed severity | Current status | Evidence (re-read now) |
|---|---|---|---|---|
| P1 | Hardcoded SuperAdmin password on public login page + seed | Critical | FIXED (residual comment) | `components/SuperAdminLoginForm.jsx` has no credential literal; `prisma/seed.js:85-92` env/random password. Residual stale comment `lib/auth.js:5-7` |
| P2 | `POST /api/fees/collect` no auth | Critical | FIXED | `app/api/fees/collect/route.js:6` `requirePermission('fees.collect')` |
| P3 | `POST /api/fees/structures` no auth | Critical | FIXED | `app/api/fees/structures/route.js:10,25` (GET `fees.view`, POST `fees.create`) |
| P4 | `/api/fees/students/[id]/discount` no auth | Critical | FIXED | `.../discount/route.js:6,20` `fees.update` on POST and DELETE |
| P5 | `PUT /api/school/profile` no auth | Critical | FIXED | `app/api/school/profile/route.js:6` `settings.update` |
| P6 | branding/contact/preferences/attendance-settings no auth | Critical | FIXED | each `app/api/school/<x>/route.js:6` `settings.update` (all four re-opened) |
| P7 | `/api/sessions` + `[id]` activate/archive no auth | Critical | FIXED | `app/api/sessions/route.js:6`, `sessions/[id]/route.js:6`, `activate/route.js:6`, `archive/route.js:6` |
| P8 | `admins/[id]/reset-password` no auth | Critical | FIXED | `app/api/admins/[id]/reset-password/route.js:6` `requireSuperAdmin()` |
| P9 | `admins/[id]/permissions` no auth | Critical | FIXED | `.../permissions/route.js:6` `requireSuperAdmin()` |
| P10 | `admins/[id]/status` no auth | Critical | FIXED | `.../status/route.js:6` `requireSuperAdmin()` |
| P11 | `schools/[id]/manage` no auth | Critical | FIXED | `app/api/schools/[id]/manage/route.js:8` `requireSuperAdmin()` |
| P12 | `globalThis.__CURRENT_USER__` drives authorization | Critical | PARTIALLY FIXED | still defined `lib/currentUser.js:12`; routes gate on `requirePermission` first (e.g. `app/api/attendance/route.js:17`, `performance/yearly/route.js:9`) but fall back to `getCurrentUser()` (`attendance/route.js:31`, `yearly/route.js:19`); `setCurrentRole` still called `app/actions/auth.js:92,111,138` |
| P13 | `getActiveSchoolId()` default in students/teachers | Critical | PARTIALLY FIXED | no default left in `lib/students.js` / `lib/teachers.js` (only a comment `teachers.js:435`); but `lib/auth/schoolContext.js:26` still falls back to the singleton when no session (affects cron, OBS-003) |
| P14 | Student/StudentFee/Payment delete crash, no soft-delete | Critical | FIXED | `StudentStatus` has TransferredOut/Graduated `schema.prisma:343-348`; FK Restrict + friendly message `lib/students.js:673-692`. Not executed. Erasure side effects: PRV-004 |
| P15 | `JWT_SECRET` demo value in prod | Critical | UNVERIFIABLE | production env not accessible. Locally `.env` is git-ignored (`git check-ignore` -> ignored, not in `git ls-files`) but still carries a comment self-labelling the secret "demo-only". Must be rotated/confirmed in Vercel |
| P16 | Fee summary null-actor bypass | Critical | FIXED (sibling routes still have the pattern) | `app/api/fees/student/[studentId]/summary/route.js:13-19` requires actor. Same `actor?.role === 'Parent'` null-skip remains in `app/api/payments/razorpay/create-order/route.js:13` and `verify/route.js:12` (see OBS-007) |
| P17 | No rate limiting on logins | High | PARTIALLY FIXED | `lib/auth/loginRateLimit.js` (in-memory Map, 8/acct, 20/IP per 15 min) used by `app/actions/auth.js`, parent/teacher/staff login routes. Per-instance, resets on cold start (its own header says so); no alerting |
| P18 | `Access-Control-Allow-Origin: *` on `/api/**` | High | STILL OPEN | `middleware.js:61` wildcard; comment `:44-48` argues Bearer-only. Practical risk is low (browsers do not send cookies with a wildcard origin) but the config is unchanged |
| P19 | `ADMIN_PERMISSIONS` decorative | High | PARTIALLY FIXED | enforcement is now RBAC (`lib/rbac.js` `requirePermission`, `prisma/rbacPermissions.js`); `ADMIN_PERMISSIONS` in `lib/adminConstants.js:7` is only imported by `lib/admins.js:4` (defaults), still not enforced. UI not re-checked |
| P20 | `getSchoolStudents` unbounded | High | FIXED | `app/dashboard/students/page.jsx:2,70` uses `getStudentsPage`; `app/api/students/paged/route.js:27` |
| P21 | `getSchoolTeachers` unbounded | High | FIXED | `app/dashboard/teachers/page.jsx:4,17`; `lib/teachers.js:185-218` skip/take |
| P22 | Fees 8+ unbounded `findMany` | High | PARTIALLY FIXED | paging added `lib/fees.js:789,1304-1305`; original sites not individually re-verified; `findMany` total across `lib/*.js` now 146 |
| P23 | Attendance query no date bound | High | FIXED (cited site) | `lib/attendance.js:178-181` `date: {gte, lte}` |
| P24 | Students page fetch-all-then-slice | High | FIXED | `app/dashboard/students/page.jsx:70` server-side page |
| P25 | Teachers page same | High | FIXED | `app/dashboard/teachers/page.jsx:17` |
| P26 | Raw `<img>` everywhere | High | STILL OPEN | 19 `<img` occurrences remain in `components/`+`app/`; `next/image` appears in only 3 files (login screens) |
| P27 | Single migration, no `migrate deploy` | High | STILL OPEN | `prisma/migrations/` has one folder + lock file; `package.json:7` build = `prisma generate && next build` |
| P28 | No refund workflow | High | STILL OPEN | only comments mention it (`lib/fees.js:850,870`); permission key `fees.refund` exists (`prisma/rbacPermissions.js`) but no refund function/route (`grep -ri refund app/api` -> none) |
| P29 | Late fee never charged | High | FIXED | `lib/fees.js:119-142` `lateFeeAmountFor` folded into payable amount |
| P30 | No server-side R2 size enforcement | Medium | STILL OPEN | `lib/storage.js:33-40` PutObject with no ContentLength condition; size only compared to client-reported `fileSize` (`app/api/students/document-upload-url/route.js:22`) |
| P31 | zod schemas unused by API | Medium | STILL OPEN | `grep -rln "lib/schemas" app` -> 0 files under `app/api`; schemas used only by client forms. `lib/schemas.js` is 659 lines |
| P32 | `Notice` missing `@@index([schoolId])` | Medium | STILL OPEN | `schema.prisma:916-~972` Notice has only `@@map` |
| P33 | `CalendarEvent` missing index | Medium | STILL OPEN | `schema.prisma:892-914` only `@@map` |
| P34 | No `error.jsx` | Medium | STILL OPEN | `find app -name error.jsx -o -name global-error.jsx` -> none; only `app/not-found.jsx` |
| P35 | `loading.jsx` missing on main routes | Medium | FIXED | 40 `loading.jsx` files now incl. students, teachers, fees, exams, attendance, dashboard home |
| P36 | `aria-label` near-zero | Medium | STILL OPEN | 2 `aria-label` lines in all `components/` |
| P37 | No focus trap in Modal | Medium | STILL OPEN | `components/Modal.jsx` has no focus management (grep for focus/Tab -> no matches) |
| P38 | No admissions workflow | Medium | STILL OPEN | no admissions/enquiry route group in `app/api` listing |
| P39 | Absent forces 0 before retake merge | Medium | STILL OPEN (business rule; not re-judged) | `lib/examResults.js:187-194` absent -> 0 and `allSubjectsPass=false`; retake policy applied later `:259-281` |
| P40 | Attendance unlock no deadline re-check | Medium | STILL OPEN | `lib/attendance.js:72-79` only toggles `manuallyUnlocked`; `app/api/attendance/[id]/lock/route.js:14-22` only permission + existence check |
| P41 | `GET /api/exams/[id]` not school-scoped | Medium | FIXED | `lib/exams.js:156-160` `findFirst({id, schoolId})`; route `app/api/exams/[id]/route.js:8-13` |
| P42 | Seed demo credentials | Low | STILL OPEN | `prisma/seed.js:112-113` two demo admin accounts with literal shared password; whether ever seeded in prod is UNVERIFIABLE |
| P43 | Split `lib/api.js` | Low | STILL OPEN | now 2,181 lines (was 1,514) |
| P44 | Split `lib/fees.js` | Low | STILL OPEN | now 1,728 lines (was 1,118) |
| P45 | Move `studentSeedData.js` out of lib | Low | STILL OPEN | `lib/studentSeedData.js` 816 lines still in `lib/` |
| P46 | Split `lib/schemas.js` | Low | STILL OPEN | 659 lines |
| P47 | Shared stats helper students/teachers | Low | UNVERIFIABLE | not re-read (duplication claim; low value) |
| P48 | Mobile responsive coverage on two components | Low | STILL OPEN (by prior's own metric) | breakpoint-class count: `TeachersExplorer.jsx` 0, `StudentFeeDetailPanel.jsx` 1. Not visually tested |
| P49 | Push retry/dead-letter | Low | STILL OPEN | `lib/expoPush.js:41-61` prunes `DeviceNotRegistered` tokens and logs other errors; no retry, no delivery record (OBS-006) |
| P50 | No error tracking | Low | STILL OPEN (web) | no Sentry/APM in web `package.json`; mobile app does have `@sentry/react-native` (`schoolapp360/src/core/sentry.js`). OBS-001 |
| P51 | Backup/restore strategy undocumented | Low | STILL OPEN / UNVERIFIABLE | only `docs/API-Spec.md` exists; no backup/DR/incident doc in repo. Provider-side backups not assessable. OBS-010 |

## B. Additional concrete claims in AUDIT_REPORT.md not itemised in the checklist

| # | Prior finding | Claimed severity | Current status | Evidence |
|---|---|---|---|---|
| R1 | No shared auth middleware for `/api/**`; each route self-guards | High (design) | STILL OPEN | `middleware.js:55-66` only applies CORS for `/api/`; routes self-guard |
| R2 | Attendance routes (4) have no real-session fallback, run off global | Critical | FIXED | `attendance/route.js:17` and `attendance/[id]/lock/route.js:14` use `requirePermission`; global only a post-auth fallback (see P12) |
| R3 | Role check in lock route used global toggle | High | FIXED | `lock/route.js:14` |
| R4 | CORS `*` with cookie routes | High | STILL OPEN | see P18 |
| R5 | Inconsistent 404 vs 403 | Low | UNVERIFIABLE | not systematically re-sampled |
| R6 | Student/Teacher/Accountant/Staff roles don't exist | Medium | FIXED (changed) | `lib/rbacConstants.js:6` roles: SuperAdmin, Principal, Admin, Teacher, Accountant, Parent |
| R7 | One Active session per school only app-level | Medium | STILL OPEN | `lib/academicSessions.js:132-133` two sequential writes, not a transaction; no partial unique index |
| R8 | `Teacher.assignments` Json scanned in JS | Medium | PARTIALLY FIXED | class filter now SQL jsonb `@>` (`lib/teachers.js:203-207`); authorization scope helpers still read Json in JS |
| R9 | "Step into school" has no audit log | Medium | STILL OPEN | `app/api/schools/[id]/manage/route.js:8-25` guarded but writes no log (OBS-008) |
| R10 | No security headers | Medium | STILL OPEN | `next.config.mjs` is empty; no X-Frame/CSP/HSTS in `middleware.js` |
| R11 | `vercel.json` `syd1` pin silently ignored on Hobby | Medium | UNVERIFIABLE | Vercel plan not visible from code; `vercel.json:2` still pins `syd1` |
| R12 | SMTP is Gmail/dev-tier | Medium | UNVERIFIABLE | env values intentionally not read; code supports generic SMTP (`lib/email.js`) and dev-log fallback (OBS-011) |
| R13 | Dashboard unbounded Promise.all queries (`lib/dashboard.js:304-322`, `lib/exams.js:311-321`) | Medium | UNVERIFIABLE | not re-measured (performance auditor's area) |
| R14 | `lib/classes.js` mixes roster queries; `lib/api.js` generically named | Low | UNVERIFIABLE | not re-read |
| R15 | Cross-tenant race via manage route + role toggle | Critical | PARTIALLY FIXED | manage route now SuperAdmin-guarded (P11), but `setActiveSchoolContext`/`setCurrentRole` still mutate process-wide state (`manage/route.js:21,24`); a SuperAdmin "step in" still changes the fallback school for every no-session code path on that instance |
| R16 | Multi-school teacher/parent accounts unsupported | Info | STILL OPEN (design) | `Teacher.schoolId`, `ParentAccount.schoolId` singular (`schema.prisma:271-286`) |

## Notes / residuals found while reconciling (new, owned by A6 or flagged for others)

- `app/api/payments/razorpay/create-order/route.js:13` and `verify/route.js:12`: ownership check is skipped when no actor is signed in (same pattern the prior audit flagged for the fee summary). Code-based; see OBS-007.
- `lib/auth.js:5-7`: comment retains the old demo credentials in clear text.
- `dev.log` (46 KB) is tracked in git (`git ls-files`), see OBS-012.
- Prior audit's "decorative permission" and "fee routes unguarded" findings were reflected by a large RBAC refactor (task comments in `prisma/rbacPermissions.js`). The guards exist; correctness of each permission-to-route mapping belongs to the authorization auditor.
