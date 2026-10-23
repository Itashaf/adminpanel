# 03 — Backend and API audit (auditor A3)

Prefixes: `API` (endpoint correctness), `BIZ` (business-logic integrity). Scorecard area: "Backend and APIs".
Audit date 2026-10-10, current working tree, code-based plus read-only `GET` probes against `http://localhost:3000` (no cookie, no POST/PUT/PATCH/DELETE, no `/api/cron/*`).

## Scope

ADMIN `app/api/**/route.js` (180 files, 225 exported handlers), `app/actions/auth.js`, `lib/*.js` business logic (fees, students, attendance, exams, marks, results, notices, support, storage, iam, rbac, expoPush, pusher, razorpay), `lib/schemas.js`, `middleware.js`, `vercel.json`.

## Method and sampling

- Inventory: glob of all 180 `route.js`, scripted scan for methods and auth tokens (`requirePermission`, `getCurrentUserInfo`, `requireParent`, `requireTeacher`, `requireSchoolAdmin`, `requireSuperAdmin`, `CRON_SECRET`). Every file whose scan returned NO auth token was then read in full.
- **Fully read (code, line by line): 111 of 180 route files** (all fees, payments, attendance, exams core, students core, promote, support, every `*upload-url`, notices, leaves, homework, sessions, users, roles, schools POST, parent/teacher samples, cron). **Remaining ~69 files** (e.g. most `performance/*`, `school/*`, `classes/*/sections/*`, `admins/*`, `parent/*` read-only lists, `teacher/*` self-service) were classified from the token scan plus the pattern of the same handler family; they are reported as "gate seen, body not read".
- Libs traced route to lib to prisma: `lib/fees.js` (generation, discount, collect, bulk-collect, Razorpay order/verify), `lib/students.js` (add/promote/retain/update/delete), `lib/attendance.js`, `lib/teacherAttendance.js`, `lib/examMarks.js`, `lib/examResults.js`, `lib/exams.js` (status), `lib/notices.js` (fan-out), `lib/support.js`, `lib/storage.js`, `lib/iam.js`, `lib/rbac.js`, `lib/currentUser.js`, `lib/school.js`, `lib/auth/schoolContext.js`.
- Verified live (GET only, no cookie): `/api/support/tickets`, `/api/subjects`, `/api/iam/me`, `/api/classes/sections-map`, `/api/exams`, `/api/fees/students/<id>/ledger`, `/api/notices`, `/api/homework`, `/api/students`, `/api/timetable`, plus templates. Response bodies were not copied here.
- Not verified by execution: every mutating-handler finding (code-based only). No DB queries were run.

## Summary table

| ID | Sev | Conf | Title | Component |
|---|---|---|---|---|
| API-001 | P0 | High | Session-less requests are served as a global "dashboard Teacher" actor; unauthenticated GET returns cross-school support tickets | `lib/iam.js`, `lib/currentUser.js`, support/exams/homework/notices routes |
| API-002 | P1 | High | `POST /api/schools` has no authentication and repoints the global active-school singleton | `app/api/schools/route.js` |
| API-003 | P1 | High | Five handlers have no auth check on any path (fee ledger, create-order, verify, attendance by student, subjects GET) | see inventory |
| BIZ-001 | P1 | High | Fee-generation cron processes one school only (global singleton), and fails open if `CRON_SECRET` is unset | `lib/fees.js:583`, `app/api/cron/generate-fees` |
| BIZ-002 | P1 | High | No Razorpay webhook; verification relies on the browser callback; abandoned checkouts lose captured payments | `lib/fees.js:1147-1265` |
| BIZ-003 | P1 | High | Online/manual payment races and overpayment: stale read, absolute write, many PENDING orders per fee, no cap | `lib/fees.js:1025-1265` |
| BIZ-004 | P1 | High | Attendance lock rules are disabled in code; `markedBy` and `records` are client-controlled | `lib/attendance.js:103-110`, `app/api/attendance/route.js` |
| API-004 | P1 | High | Roles/permissions are global (not per tenant); any holder of `permissions.manage` edits roles for all schools | `app/api/roles/[id]/permissions`, `prisma Role` |
| BIZ-005 | P2 | High | No refund/reversal path; no collector or actor recorded on payments and discounts | fees module |
| BIZ-006 | P2 | High | Marks edits after approval/publish do not invalidate or recompute results; marks save is non-transactional | `lib/examMarks.js:164-258`, `lib/examResults.js` |
| BIZ-007 | P2 | High | Attendance reports key history on the student's CURRENT class/section | `lib/attendance.js:190-196` |
| BIZ-008 | P2 | Medium | Promotion: promote and retain run as parallel transactions; no status/target validation; no fee/dues handling | `app/api/students/promote`, `lib/students.js:738-875` |
| BIZ-009 | P2 | Medium | Notification/push fan-out is fire-and-forget (un-awaited) on serverless; no retry or outbox | `lib/notices.js:542`, `lib/fees.js:1052` |
| API-005 | P2 | High | No server-side schema validation; client-only zod; malformed JSON gives 500 | all POST/PUT routes |
| API-006 | P2 | High | Unbounded list responses and unbounded request arrays | students, users, notices, bulk-collect, bulk-import |
| API-007 | P2 | Medium | Upload presign does not bind size; free-form `attachmentUrl`/`photoUrl` stored; cleanup cron can delete another tenant's R2 object | upload-url routes, `lib/support.js:229` |
| API-008 | P2 | High | Rate limiting exists only on logins and is in-memory per instance | `lib/auth/loginRateLimit.js` |
| API-009 | P3 | High | `err.message` (incl. raw Prisma/SDK text) returned to clients in ~97 places | all routes |
| API-010 | P3 | High | Temp passwords generated with `Math.random` and returned in the response | `app/api/users/route.js:17`, `lib/admins.js:6`, `lib/parentAccounts.js:6` |
| BIZ-010 | P3 | Medium | Exam status has no transition rules; re-generating results silently unpublishes | `lib/exams.js:279`, `lib/examResults.js:207` |
| API-011 | P3 | Medium | Sequential awaits / N+1 / full-school loads in fee generation, bulk import, teacher student list | `lib/fees.js:437`, `lib/students.js:540` |

## Endpoint inventory (180 files, 225 handlers)

Auth gate = what the handler calls first. "Perm" = permission gate. "Scoped" = tenant/ownership scoping inside the lib (by `schoolId` from `resolveSchoolId()`, which prefers the session claim and otherwise falls back to the global singleton, see API-001/SEC).

| Area | Files / handlers | Auth gate | Permission gate | Notes |
|---|---|---|---|---|
| auth | 4 / 4 | none by design (login); `getSession` on parent/switch | in-memory rate limit on 3 logins | `await request.json()` before try |
| students | 15 / 22 | `requirePermission` (most); `getCurrentUserInfo` role check on `GET /students`, `/paged`, `/print-details` | students.create/update/delete/view; Teacher extra block | `bulk-import/template` + `blank-template` have no auth (static xlsx, benign) |
| teachers | 8 / 9 | `requirePermission`; upload-urls `requireAnyPermission` / `requireTeacher` | teachers.* | |
| classes | 10 / 11 | `requirePermission('classes.manage')`; `sections-map` `getCurrentUserInfo` | classes.manage | any signed-in user may read sections-map |
| attendance | 7 / 8 | `requirePermission` + `getCurrentUserInfo` fallback; `requireTeacher` check-in; `student/[id]` none | attendance.student.* | `student/[id]` has no auth (API-003) |
| staff-attendance | 1 / 2 | `requirePermission` + Teacher block | attendance.teacher.* | |
| exams / marks / results | 16 / 25 | mix of `requirePermission` and bare `getCurrentUserInfo`; ownership enforced in lib (`assertCanAccessSchedule`, `assertCanManageSchedule`) | exams.manage, marks.update, results.publish/view | status, schedules, marks routes rely on lib-level role checks only |
| fees / payments / razorpay | 18 / 22 | `requirePermission` for admin; `getCurrentUserInfo` + Parent ownership for parent reads; **none** on ledger, create-order, verify | fees.view/create/update/collect | `fees.refund` permission exists, no refund endpoint |
| notices | 5 / 8 | `requirePermission` for writes; `getCurrentUserInfo` for reads | notices.* | |
| homework | 3 / 5 | `getCurrentUserInfo` (401 if null) | role scoping in lib | fixed in tree vs old toggle fallback |
| leaves | 3 / 4 | `requirePermission` | leave.apply/view/approve/reject | |
| calendar-events | 2 / 4 | `requireSchoolAdmin` | role only (no RBAC key) | scoped by schoolId in lib |
| timetable | 2 / 4 | `getCurrentUserInfo` / `requirePermission` (list) | class-teacher check for writes | |
| performance | 21 / 23 | `requirePermission` (all) + Teacher blocks | performanceReports.* | 4 bodies read, rest by pattern |
| support (new) | 6 / 7 | `getCurrentUserInfo` + Parent block; `requireSuperAdmin` for status | none; tenancy via `actor.schoolId` | see API-001 |
| parent | 11 / 11 | `requireParent` (all) | ownership via `actor.studentId` from session | good |
| teacher (mobile) | 7 / 7 | `requireTeacher` (all) | scoped by `teacherId` | good |
| sessions | 4 / 4 | `requirePermission('settings.update')` | settings.update | no transaction on activate (BIZ minor) |
| roles / permissions / users | 3+1+3 / 5+1+4 | `requirePermission` | roles.*, permissions.manage, users.* | roles are global (API-004) |
| school (settings) | 6 / 6 | `requirePermission('settings.update')` | settings.update | |
| schools / admins / super-admin | 7+5 / 9+5 | `requireSuperAdmin` except **`POST /api/schools`** | role only | |
| cron | 2 / 2 | `CRON_SECRET` bearer, fail-open if env unset | none | |
| uploads (13 routes) | within areas | RBAC or role check per route | type allow-list + client-stated size | see API-007 |
| misc (iam/me, notifications/register-token, print-marksheet, admin*, subjects) | 8 / 11 | `getCurrentUserInfo`; **subjects GET none** | | |

### Handlers with NO authentication call on any path

| # | Handler | File:line | Reads/writes | Cross-ref |
|---|---|---|---|---|
| 1 | `POST /api/schools` | `app/api/schools/route.js:21` | creates a School row, calls `setActiveSchoolContext`, creates and activates an academic session | SEC |
| 2 | `GET /api/fees/students/[id]/ledger` | `app/api/fees/students/[id]/ledger/route.js:5` | full payment history for any studentId in the resolved school | SEC |
| 3 | `POST /api/payments/razorpay/create-order` | `app/api/payments/razorpay/create-order/route.js:5` | creates a real Razorpay order and PENDING Payment for any studentFeeId | SEC |
| 4 | `POST /api/payments/razorpay/verify` | `app/api/payments/razorpay/verify/route.js:5` | marks a fee paid when signature valid | SEC |
| 5 | `GET /api/attendance/student/[id]` | `app/api/attendance/student/[id]/route.js:5` | attendance stats for any student | SEC |
| 6 | `GET /api/subjects` | `app/api/subjects/route.js:11` | lists subjects and runs `ensureSeeded` (a DB write) for the fallback school; confirmed 200 live with no cookie | SEC |
| 7-8 | `GET /api/students/bulk-import/template`, `/blank-template` | `.../template/route.js:182`, `.../blank-template/route.js:42` | static xlsx, benign | none |

Handlers whose "auth" is only `getCurrentUserInfo()` non-null (and therefore inherit API-001): `exams` GET family, `exams/[id]/status`, `exams/[id]/schedules`, `exams/schedules/[scheduleId]/marks|route`, `homework*`, `notices GET/page/paged`, `print-marksheet*`, `timetable GET`, `classes/sections-map`, `support/*`, `iam/me`, `notifications/register-token`, `fees/student/[studentId]*`, `students GET/paged/print-details`. Role-only checks without ownership scoping: `calendar-events*` (`requireSchoolAdmin`, scoped in lib), `admin/profile*`.

## Findings

### API-001 — Session-less requests are served as a global "dashboard Teacher" actor
- **Category:** Backend (cross-ref SEC)
- **Severity:** P0   **Confidence:** High   **Status:** Confirmed (live GET, code-confirmed)
- **Affected component:** `lib/iam.js` `getCurrentUserInfo`, `lib/currentUser.js`, ~25 handlers that treat a non-null actor as signed in
- **Evidence:** `lib/iam.js:199-210` falls back to `getDashboardRoleUser()` when there is no session; `lib/currentUser.js:9` keeps the role in `globalThis.__CURRENT_USER__`; every web login calls `setCurrentRole` (`app/actions/auth.js:92,111,138`), so the last web Teacher login makes every cookie-less request a Teacher. That fallback actor has no `schoolId`. Live, no cookie: `GET /api/iam/me` returned a Teacher user, `/api/exams`, `/api/classes/sections-map`, `/api/subjects`, `/api/notices` returned 200, and `GET /api/support/tickets` returned ticket objects (including `ticketNumber`, `schoolId`) because `getSchoolTickets(undefined)` (`lib/support.js` where `{schoolId: undefined}`) applies no filter, i.e. tickets of ALL schools (`app/api/support/tickets/route.js`, `lib/support.js getSchoolTickets`).
- **Impact:** unauthenticated cross-tenant read of support tickets (subjects, messages, names, attachment URLs); unauthenticated access to every route that only checks `if (!actor)`. State depends on which role last logged in on that server instance, so it is intermittent in serverless but permanent on a long-lived instance.
- **Reproduction / verification:** `curl http://localhost:3000/api/support/tickets` with no cookie (done, GET only).
- **Root cause:** a demo "role preview" singleton left inside the production identity resolver.
- **Recommended fix:** remove the dashboard-toggle branch from `getCurrentUserInfo` (return `null` when `getSession()` is empty); delete `lib/currentUser.js` global state or confine it to a dev flag; in `getSchoolTickets` and similar helpers throw if `schoolId` is falsy.
- **Validation:** with no cookie, all `/api/*` except login return 401; add a smoke script asserting this.
- **Effort:** S–M   **Dependencies:** API-003, SEC findings

### API-002 — `POST /api/schools` is unauthenticated and flips global tenant context
- **Category:** Security/Backend
- **Severity:** P1   **Confidence:** High   **Status:** Confirmed (code-based; not executed)
- **Evidence:** `app/api/schools/route.js:21-53` — no `requireSuperAdmin` (only the `GET` at line 7 has it). It calls `addSchoolFromWizard` (`lib/schools.js:120`, creates a School), then `setActiveSchoolContext(school)` (`lib/school.js`, mutates `globalThis.__ACTIVE_SCHOOL__`) and `addSession`/`setActiveSession`.
- **Impact:** anyone can create tenants (code collision probing, junk rows) and repoint the instance's fallback school, which affects the cron job, SuperAdmin sessions and API-001 actors for all later requests on that instance.
- **Recommended fix:** `const { error } = await requireSuperAdmin(); if (error) return error;` at the top; pass the new school id explicitly to session creation instead of mutating the singleton.
- **Validation:** unauthenticated POST returns 403.   **Effort:** S   **Dependencies:** API-001, BIZ-001

### API-003 — Five handlers without any authentication check
- **Category:** Backend (cross-ref SEC)
- **Severity:** P1   **Confidence:** High   **Status:** Confirmed (code; GET ledger/subjects confirmed live)
- **Evidence:** ledger `route.js:5-18` only blocks a Parent for a different child, never 401s on null; `create-order/route.js:11-17` and `verify/route.js:11-17` run the ownership check only when `actor?.role === 'Parent'`, otherwise proceed; `attendance/student/[id]/route.js:20-22` same pattern; `subjects/route.js:11`. Contrast the sibling `fees/student/[studentId]/route.js` which was fixed.
- **Impact:** payment history and attendance of any student readable without login; unauthenticated Razorpay order creation (creates PENDING Payment rows and live Razorpay orders: abuse/spam); unauthenticated verify.
- **Recommended fix:** use `requireParent`/`requirePermission('fees.view')` or at minimum `if (!actor) 401` plus ownership check for any non-admin role; add a shared `requireActor()` helper.
- **Validation:** unauthenticated call returns 401.   **Effort:** S   **Dependencies:** API-001

### BIZ-001 — Fee generation cron serves one school and fails open
- **Category:** Backend
- **Severity:** P1   **Confidence:** High   **Status:** Confirmed (code)
- **Evidence:** `lib/fees.js:583-607` `generateDueStudentFees` calls `getFeeStructures()` which resolves the school via `resolveSchoolId()` (`lib/fees.js:217`) with no session, i.e. the global singleton (`lib/school.js`, defaults to a seed id). `app/api/cron/generate-fees/route.js:12-15` and `cleanup-support-tickets/route.js` only check the bearer when `process.env.CRON_SECRET` is set (fail-open).
- **Impact:** in a multi-school deployment only one school gets auto-generated fees; the rest silently never do. If the secret is missing the endpoints are publicly callable (mass generation / ticket purge).
- **Recommended fix:** loop `prisma.school.findMany({status:'Active'})` and pass `schoolId` into every lib call; return 500 when `CRON_SECRET` is unset.
- **Validation:** staging with two schools, cron yields fees for both; request without secret returns 401.   **Effort:** M   **Dependencies:** API-002

### BIZ-002 — Razorpay: no webhook, browser-callback-only confirmation
- **Category:** Backend (financial)
- **Severity:** P1   **Confidence:** High   **Status:** Confirmed (code; grep shows "webhook" only in comments)
- **Evidence:** no `webhook` route exists under `app/api`; `lib/fees.js:1186-1193` comment acknowledges it. `verifyRazorpayPayment` (`lib/fees.js:1194-1265`) is reached only from the client POST.
- **Impact:** if the parent's browser/app closes, loses network, or the callback fails after Razorpay captures money, the Payment row stays PENDING forever (no cleanup job, comment at `lib/fees.js:1142`) and the fee stays unpaid: money taken, school sees no payment. No reconciliation job either.
- **Handled:** HMAC-SHA256 signature check with per-school secret and `timingSafeEqual` (`lib/razorpay.js`), order must belong to the fee and school (`fees.js:1204`), amount decided server-side, `razorpayPaymentId` unique, duplicate verify short-circuits on `status === 'SUCCESS'`, writes in one `$transaction`.
- **Missing:** webhook (`payment.captured`/`order.paid`) with signature verification and idempotency; gateway-side amount fetch; stale PENDING expiry/reconciliation; refund webhook.
- **Recommended fix:** add `app/api/payments/razorpay/webhook/route.js` verifying `X-Razorpay-Signature` over the raw body with the school's webhook secret, resolving the Payment by `razorpayOrderId`, and reusing one shared `applySuccessfulPayment(paymentId)` that is idempotent and runs in a transaction with a conditional update (`updateMany where status:'PENDING'`).
- **Effort:** M   **Dependencies:** BIZ-003

### BIZ-003 — Payment races and overpayment
- **Category:** Backend (financial)
- **Severity:** P1   **Confidence:** High   **Status:** Confirmed (code-based; not executed)
- **Evidence:** `collectManualPayment` (`lib/fees.js:1025-1081`) reads the fee, computes `newPaidAmount = fee.paidAmount + collectAmount` in JS and writes it as an absolute value; no row lock, no idempotency key. `verifyRazorpayPayment` (`fees.js:1239-1251`) does the same with `payment.amount`, never re-checking that the amount is still owed. `createRazorpayOrder` (`fees.js:1147`) creates a new PENDING order on every call with no reuse or cap.
- **Impact:** (1) two concurrent manual collections both pass the `<= remainingDue` check, create two Payment rows, but `paidAmount` is overwritten with one value (ledger sum greater than `paidAmount`); (2) a parent who opened two checkouts, or paid online after an admin collected cash, can have both verified: `paidAmount` exceeds payable, status PAID, no refund path (BIZ-005); (3) double-click on collect creates duplicate Payments.
- **Recommended fix:** use atomic updates: `prisma.studentFee.updateMany({ where: {id, schoolId, paidAmount: fee.paidAmount}, data:{ paidAmount: {increment: amt}}})` inside the transaction and abort on `count===0`; in verify re-compute remaining due and reject/flag overpay; reuse an existing PENDING order for the same fee; accept an `Idempotency-Key` on `/api/fees/collect`.
- **Validation:** concurrent test (two parallel POSTs) leaves `paidAmount === sum(SUCCESS payments)`.   **Effort:** M

### BIZ-004 — Attendance edit/lock rules disabled; client-controlled fields
- **Category:** Backend
- **Severity:** P1   **Confidence:** High   **Status:** Confirmed (code)
- **Evidence:** `lib/attendance.js:103-110` `ATTENDANCE_LOCK_ENABLED = false` makes `computeAttendanceAccess` always allow; the manual unlock (`manuallyUnlocked`, `attendance/[id]/lock`) therefore has no effect. `app/api/attendance/route.js` passes the raw body to `saveAttendance` (`lib/attendance.js:57`), which upserts `markedBy` (client supplied, `DailyAttendanceBoard.jsx:202`) and `records` (no schema check: statuses, studentIds belonging to the class, duplicates). Only Sunday is rejected; school calendar holidays and future dates are accepted.
- **Impact:** a Teacher can alter any past or future date for their class, forge `markedBy`, and write arbitrary JSON into `records`, corrupting reports. Concurrent submissions are last-write-wins via the `[school, session, date, class, section]` unique upsert (no duplicate rows, which is good).
- **Recommended fix:** turn the flag on (or delete the dead matrix and decide the policy), derive `markedBy` from the session, validate `records` against the roster and `ATTENDANCE_STATUSES`, reject future dates.
- **Effort:** S–M

### API-004 — Roles and permissions are global, not per tenant
- **Category:** Security/Backend (cross-ref TEN)
- **Severity:** P1   **Confidence:** High   **Status:** Confirmed (code)
- **Evidence:** `prisma Role` has `key @unique` and no `schoolId` (`schema.prisma:70-82`); `app/api/roles/[id]/permissions/route.js` replaces `RolePermission` rows of that single global role; `prisma/rbacPermissions.js:98` gives `PRINCIPAL = ALL_KEYS` which includes `permissions.manage` (`:70`).
- **Impact:** a Principal of school A can change what Admin/Teacher/Accountant may do in every other school (including granting themselves nothing more, but revoking fees access platform-wide, or giving Teachers `students.delete`).
- **Recommended fix:** restrict `permissions.manage` to SuperAdmin, or make roles per-school.   **Effort:** S (restrict) / L (per-school)

### BIZ-005 — No refund/reversal, thin financial audit trail
- **Category:** Backend (Missing control)
- **Severity:** P2   **Confidence:** High   **Status:** Confirmed
- **Evidence:** permission `fees.refund` exists (`prisma/rbacPermissions.js:128`) but no handler uses it; `Payment` model (`schema.prisma:1427`) has no `collectedBy`, `reference`, `receiptNo`, `refundedAt`; `applyFeeDiscount` blocks discounts below paid amount ("process a refund first", `fees.js:870`) yet no refund exists. Discount apply/remove, fee delete and collections write no audit row (exams have `logExamAudit`, fees do not).
- **Impact:** wrong or duplicate collections cannot be reversed in-app; no answer to "who collected or discounted this".
- **Recommended fix:** add `Payment.collectedById/collectedByName`, a `FeeAuditLog` model written in the same transaction, and a `POST /api/fees/payments/[id]/reverse` gated by `fees.refund`.   **Effort:** M–L
- Money handling: `Int` rupee columns (no floats), PERCENT discount rounded with `Math.round`, late fee computed on read (`lateFeeAmountFor`) so `payableAmount` drifts upward daily while `status` was set PAID earlier with a fixed `paidAmount` (BIZ-003 side effect); manual amounts like `10.5` would raise a Prisma Int error returned as 400 with raw message.

### BIZ-006 — Marks and results integrity
- **Category:** Backend
- **Severity:** P2   **Confidence:** High   **Status:** Confirmed (code)
- **Evidence:** `saveExamMarks` (`lib/examMarks.js:164-258`) for an admin overwrites `status` with `Draft`/`Submitted` on rows that were `Approved`/`Published` (`:247`) and does not touch `ExamResult`; results are only recomputed when an admin runs generate manually (`examResults.js:113`). Upserts run one by one without a transaction (`:240-258`), so a failure leaves a partly saved sheet. `row.studentId` is not checked against the schedule roster. Max marks are checked at save time but `updateExamSchedule` can lower `maxMarks`/`passingMarks` later with no re-validation. `generateExamResults` re-upsert resets `status` to `Draft` (`:207`), un-publishing results parents already saw.
- **Handled well:** teacher scoping (`assertCanAccessSchedule`), teacher lock after Submit, Approve/Reject/Unlock admin-only with audit log (`logExamAudit`), negative/over-max checks, completeness check on submit, optional-subject enrollment honoured in result generation.
- **Missing:** retake/re-exam policy beyond a `ReExam` attendance value; automatic invalidation of published results on mark edits.
- **Recommended fix:** when a mark of a published exam changes, flag the student's `ExamResult` stale (or recompute) and keep status; wrap the row loop in `$transaction`; validate studentIds against the roster.   **Effort:** M

### BIZ-007 — Attendance history keyed by current class/section
- **Category:** Backend
- **Severity:** P2   **Confidence:** High   **Status:** Confirmed (code)
- **Evidence:** `statusFromMap` (`lib/attendance.js:190-196`) looks up `${date}|${student.class}|${student.section}` using the student's CURRENT class/section for all historical dates; `relevantStudents` also filters on the current `academicSession`.
- **Impact:** after a section change or promotion within the same session view, earlier days vanish from the student's report; a student recorded in two blobs (old and new section the same day) is counted once and silently.
- **Recommended fix:** join against `StudentEnrollment` for the date range or scan all `records` blobs for the studentId.   **Effort:** M

### BIZ-008 — Student promotion/retention gaps
- **Category:** Backend
- **Severity:** P2   **Confidence:** Medium   **Status:** Confirmed (code)
- **Evidence:** `app/api/students/promote/route.js` runs `promoteStudents` and `retainStudentsInSession` with `Promise.all` (separate transactions); a student id in both lists, or a conflict in one, leaves the other committed. `promoteStudents` (`lib/students.js:738`) does not require `status: 'Active'`, does not check the target class is above the source, and does nothing about unpaid fees of the old session or fee generation for the new one.
- **Handled well:** target session/class/section must exist, enrollment unique per `(studentId, academicSessionId)`, `StudentPromotionLog` row per action with actor, `StudentEnrollment` history, withdrawal via status (`TransferredOut/Inactive/Graduated`) updates enrollment and logs, delete blocked when fee/payment rows exist, admission number uniqueness via DB unique + P2002 (no race; the number is entered manually, not generated). `addStudent` silently skips the initial enrollment row if session/class are missing.
- **Recommended fix:** run the two operations sequentially in one transaction, filter `status: 'Active'`, call `generateFeesForNewStudent` after promotion.   **Effort:** M

### BIZ-009 — Fire-and-forget notifications
- **Category:** Backend
- **Severity:** P2   **Confidence:** Medium   **Status:** Suspected (platform behaviour)
- **Evidence:** `notifyNoticeRecipients` is called without `await` (`lib/notices.js:542`), as are `notifyPaymentConfirmed` (`lib/fees.js:1052`, `:1130`), `createAdminNotification`. On Vercel the function can be frozen after the response is sent. Expo errors are only logged; `DeviceNotRegistered` tokens are pruned (good); no retry; support Pusher events use public channels with ticket ids only.
- **Recommended fix:** use `after()`/`waitUntil` (see `node_modules/next/dist/docs` for the current API) or await inside the request.   **Effort:** S

### API-005 — No server-side validation; malformed JSON gives 500
- **Category:** Backend
- **Severity:** P2   **Confidence:** High   **Status:** Confirmed
- **Evidence:** `lib/schemas.js` (zod, 659 lines) is imported only by client components (e.g. `components/fees/CollectFeeModal.jsx`); no `app/api` route imports it. 110 `await request.json()` calls, 0 with `.catch`; 36 route files have no `try` at all, and in most others `request.json()` sits before the `try`. Validation is `if (!field)` checks. Content-Type is not checked. Mass assignment is limited: `buildStudentFields`/`fieldsFrom` whitelist fields (no raw body spread into prisma found; only server-built `...data` in `examMarks.js:255`, `examSchedules.js:227`).
- **Impact:** bad bodies return 500 with a stack in logs; numeric fields (`amount`, `marksObtained`, `maxMarks`) can be strings, NaN, fractional or negative until a lib check catches them.
- **Recommended fix:** a 10-line `parseBody(request, schema)` helper using the existing zod schemas (reuse `feeStructureSchema`, `manualPaymentSchema`, etc.) returning 400.   **Effort:** M

### API-006 — Unbounded lists and arrays
- **Category:** Backend/Performance
- **Severity:** P2   **Confidence:** High   **Status:** Confirmed
- **Evidence:** `GET /api/students` returns the full decorated school (`app/api/students/route.js`), for Teachers it loads all students then filters in JS; `GET /api/users`, `GET /api/notices`, `GET /api/homework`, `GET /api/support/tickets`, `GET /api/subjects`, `getPaymentLedger`; `POST bulk-collect` `studentIds`, `students/bulk-import` `rows`, `exams/schedules/.../marks` `rows` and `fees/send-reminder` `studentIds` have no length cap. Paged variants exist for students, teachers, notices, homework, payments (page size capped at 50/100), but `payments` and `schools` do not cap `pageSize`.
- **Recommended fix:** cap array lengths (e.g. 500) and `pageSize`; migrate remaining list consumers to the paged routes.   **Effort:** S–M

### API-007 — Upload handling
- **Category:** Backend/Security
- **Severity:** P2   **Confidence:** Medium   **Status:** Confirmed (code)
- **Evidence:** 13 `*upload-url` routes (list: students photo/document, teachers photo/document, school logo, admin/parent/teacher profile photo, notices, support). All require auth and allow-list `fileType`; keys are prefixed by `schoolId` (profile photos by user id) plus a sanitized name. But size is a client-stated `fileSize` only; `getPresignedUploadUrl` (`lib/storage.js`) signs `ContentType` but no `ContentLength`/size condition, so the real size is unlimited; no virus or magic-byte check; URLs are public (`R2_PUBLIC_URL`). `attachmentUrl` (support tickets/replies, `lib/support.js:111,130`) and `photoUrl` (self-profile PATCH) are stored without checking they point to this tenant's key prefix; `cleanupOldTickets` (`lib/support.js:229-232`) deletes whatever R2 key such a URL maps to.
- **Impact:** storage abuse; a school user can reference another school's R2 object in a ticket and have it deleted by the cron after 90 days; arbitrary external URL rendered as a link.
- **Recommended fix:** validate `attachmentUrl`/`photoUrl` start with `R2_PUBLIC_URL + '/<prefix>/<schoolId>/'`; use a presigned POST with `content-length-range`.   **Effort:** S–M

### API-008 — Rate limiting
- **Category:** Backend
- **Severity:** P2   **Confidence:** High   **Status:** Confirmed
- **Evidence:** `lib/auth/loginRateLimit.js` is an in-memory `Map` (per instance, reset on cold start), used by login/reset routes only. No limit on create-order, upload-url, support tickets, bulk endpoints, or fee collection.
- **Recommended fix:** a shared store (Upstash/Postgres) for login; per-user caps on order creation and ticket creation.   **Effort:** M

### API-009 — Error message leakage
- **Category:** Backend
- **Severity:** P3   **Confidence:** High   **Status:** Confirmed
- **Evidence:** 97 `err.message` returns across routes with status 400 (e.g. `create-order/route.js` last line, `fees/collect`, `students/[id]`), so Prisma error text and SDK messages reach the client; wrong status for server faults (should be 500). The Razorpay handler also string-matches TypeErrors. No stack traces are returned.
- **Recommended fix:** a `toApiError(err)` mapper: known business errors (custom class) to 400, everything else to 500 with a generic message and server log.   **Effort:** M

### API-010 — Weak temp-password generation
- **Category:** Security (cross-ref AUTH)
- **Severity:** P3   **Confidence:** High   **Status:** Confirmed
- **Evidence:** `app/api/users/route.js:17-19`, `lib/admins.js:6-8`, `lib/parentAccounts.js:6-8` use `Math.random().toString(36).slice(2,8)` (about 31 bits, not cryptographic) and return the password in the JSON response (`users/route.js:97`).
- **Recommended fix:** `crypto.randomBytes(9).toString('base64url')`; force change at first login.   **Effort:** S

### BIZ-010 — Exam status transitions
- **Category:** Backend
- **Severity:** P3   **Confidence:** Medium   **Status:** Confirmed
- **Evidence:** `setExamStatus` (`lib/exams.js:279`) accepts any of Draft/Published/Completed from admin with no source-state rule; `publishExamResults` forces `Completed`; regenerate resets results to Draft.   **Fix:** explicit transition table.   **Effort:** S

### API-011 — Sequential awaits and full loads
- **Category:** Performance
- **Severity:** P3   **Confidence:** Medium   **Status:** Confirmed
- **Evidence:** `generateStudentFees` loads every student then filters in JS and builds one transaction of N creates (`lib/fees.js:437-490`); the `@@unique([studentId, academicSession, term])` makes a cron/admin race abort the whole transaction with P2002 (500). `bulkCreateStudents` is sequential (each `addStudent` = several queries) and the route then runs `Promise.all` of fee generation for every imported student (`students/bulk-import/route.js`). `bulkCollectFullDue` and `applyStandingDiscountToPendingFees` loop with per-row updates.
- **Recommended fix:** query students with `where: {class, academicSession, status}`, use `createMany({skipDuplicates:true})`, bound concurrency.   **Effort:** M

## Critical flows: handled vs missing

- **Fees, generation:** handled: idempotent create-or-resync of PENDING, PAID never touched, per-term unique constraint, late fee snapshot per item, new-student auto-billing. Missing: multi-school cron (BIZ-001), concurrency (API-011).
- **Fees, collection:** handled: `fees.collect` permission, status validation, partial payments, one `$transaction`. Missing: idempotency, atomic increment, collector id, receipt numbering, refund (BIZ-003/005).
- **Razorpay:** handled: server-side amount, per-school keys (encrypted secret), signature with timing-safe compare, order/fee/school binding, duplicate verify returns existing state, unique `razorpayPaymentId`. Missing: webhook, reconciliation, expiry of PENDING orders, authentication on create-order/verify (API-003), overpay guard.
- **Attendance:** handled: unique upsert per class/day, teacher class-scope check, Sunday rule. Missing: lock rules (disabled), records validation, holiday calendar, server-derived `markedBy`, history by enrollment. Staff attendance: handled self check-in idempotent, preserves admin rows; missing validation of `records` shape and date.
- **Exams:** handled: Draft→Submitted→Approved/UnderReview workflow, admin-only verify, audit log, optional-subject enrollment, weighted results, rank. Missing: invalidation on later edits, transactions (BIZ-006).
- **Students:** handled: enrollment history, promotion log, withdrawal states, duplicate admission number. Missing: see BIZ-008.
- **Communication:** handled: school-scoped fan-out queries, batch 500/100, token pruning, Individual-audience recipient checked against schoolId. Missing: durable delivery (BIZ-009). Support tickets: school-scoped by `actor.schoolId` for real sessions (good) but see API-001; reply and status routes scope by schoolId; attachment URL unvalidated (API-007).

## Positive observations

- Most mutating admin routes use `requirePermission` with a specific key; parent and teacher mobile routes consistently use `requireParent`/`requireTeacher` with ids taken from the session, never the request.
- Lib-level queries nearly always include `schoolId` (e.g. `findFirst({id, schoolId})` before update/delete on classes, subjects, calendar events, exams, notices), including `StudentFee`/`Payment` writes.
- Money is stored as integers; payment amount never comes from the client; Razorpay secrets encrypted at rest per school.
- Student promotion/update/withdrawal are transactional with an audit log; delete is blocked when billing history exists.
- Previous audit items re-verified as FIXED in the tree: `fees/student/[studentId]` and `/summary` now 401 on null actor; homework/print-marksheet no longer fall back to the toggle with an admin identity; cron routes check a secret (but see BIZ-001). Previous claim of "hardcoded SuperAdmin password" is not in my scope (AUTH).

## Limitations / not assessed

- ~69 of 180 route bodies not read line by line (classified by gate only); no handler was executed except unauthenticated GET probes.
- No DB queries, no load test, no EXPLAIN; indexes and query plans not assessed (database auditor).
- Razorpay behaviour against the live gateway not tested; webhook absence is from code search.
- `app/actions/auth.js` login logic only read for the role-toggle side effect (AUTH owns it).
- Vercel `waitUntil`/`after` semantics for un-awaited promises not verified against the `node_modules/next/dist/docs` version in use.
