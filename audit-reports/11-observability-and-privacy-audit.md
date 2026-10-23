# 11 — Observability, operations and privacy audit

Auditor: A6 (prefixes OBS, PRV). Scorecard areas: **Observability**, **Privacy and operational readiness**.

## Scope

ADMIN (`adminpanel`): logging, error tracking, cron/job health, notification delivery, payment reconciliation, audit trails, health checks, backup/incident documentation; personal-data inventory, storage, access control, retention/erasure, consent/notice, processors. MOBILE inspected only for Sentry/consent presence. Legal conclusions (DPDP Act 2023, children's data, cross-border) are **not** made here: they are flagged for legal verification.

## Method

- Listed all `lib/` and `app/api` route groups; grepped every `console.*` in `lib/`, `app/api`, `app/actions` (30 sites) and read each context.
- Read `lib/expoPush.js`, `lib/pusher.js`, `lib/adminNotifications.js`, `lib/email.js`, `lib/storage.js`, `lib/auth/encryption.js`, both cron routes, `lib/fees.js` (cron + Razorpay verify), `vercel.json`, `next.config.mjs`, `middleware.js`.
- Read `prisma/schema.prisma` Student (357-448), Teacher (~600-660), ParentAccount (271-286), Payment (1427), ExamAuditLog (1297) and RBAC grants (`prisma/rbacPermissions.js`).
- Traced student/teacher read routes (`app/api/students/route.js`, `paged`, `[id]`, `print-details`, `app/api/teachers/*`) and both document-upload routes.
- Verified vs only read: **all code-based; nothing executed**. No HTTP requests were made. Git-tracking checks (`git ls-files`, `git check-ignore`) were run.
- Sampling: 26 route files opened for this report plus the 16 for report 14.

## Summary table

| ID | Sev | Conf | Title | Component |
|---|---|---|---|---|
| PRV-001 | P1 | High | Parent and Accountant roles can read any student's full record (Aadhaar, guardians, address) | `GET /api/students/[id]` |
| PRV-002 | P1 | Medium | Aadhaar and identity documents stored under permanent unsigned public URLs | R2 storage / document upload |
| OBS-003 | P1 | High | Daily fee-generation cron only processes one fallback school, not every school | `api/cron/generate-fees`, `lib/fees.js` |
| OBS-007 | P1 | High | No Razorpay webhook or reconciliation; paid-but-unrecorded payments possible | Payments |
| PRV-003 | P2 | High | Aadhaar, PAN and bank details stored and served in plaintext | Student/Teacher models |
| PRV-004 | P2 | High | No erasure/retention path for student/teacher personal data and documents | Delete flows |
| PRV-005 | P2 | High | No privacy notice, terms or consent capture anywhere (web and mobile) | Whole product |
| OBS-001 | P2 | High | No server-side error tracking, request IDs or structured logs on the web app | Observability |
| OBS-004 | P2 | High | Cron endpoints fail open if `CRON_SECRET` is unset | `api/cron/*` |
| OBS-005 | P2 | High | Cron/job failures are swallowed: HTTP 200 and no alert | `generateDueStudentFees` |
| OBS-006 | P2 | High | Push / realtime / in-app notification failures are console-only, no retry or record | Notifications |
| OBS-008 | P2 | High | Most sensitive actions have no audit trail | Fees, roles, deletes, settings |
| OBS-010 | P2 | Medium | No backup/restore or incident-response documentation | Operations |
| PRV-006 | P3 | Medium | Third-party processors and hosting region need a documented basis | Processors |
| PRV-007 | P3 | Medium | Unredacted error objects logged; token logged in push errors | Logging |
| OBS-002 | P3 | High | No `error.jsx` / `global-error.jsx` boundaries | App shell |
| OBS-009 | P3 | High | No health/uptime endpoint or DB metrics | Operations |
| OBS-011 | P3 | High | Dev-email fallback prints recipient and full message body to logs | `lib/email.js` |
| OBS-012 | P3 | High | `dev.log` is tracked in git | Repo hygiene |
| OBS-013 | P3 | Medium | Login abuse limiter is per-instance memory with no alerting or failed-login record | Auth abuse |
| PRV-008 | P4 | Medium | Realtime channels are public with predictable names (ID-only payloads) | Pusher |

---

## Findings

### PRV-001 — Parent and Accountant roles can read any student's full record
- **Category:** Security / Privacy   
- **Severity:** P1   **Confidence:** High   **Status:** Confirmed (code-based)
- **Affected component:** `GET /api/students/[id]`, `lib/students.js` `getStudentById`/`decorateStudent`
- **Evidence:** `app/api/students/[id]/route.js:7-19` — gate is `requirePermission('students.view')` followed by a block that rejects only `user.roleKey === 'Teacher'`; the comment (lines 10-16) states the route is meant to be "admin-tier only". `prisma/rbacPermissions.js` grants `students.view` to Parent (line ~205) and Accountant (line 195) as well as Teacher/Admin. `lib/students.js:310-312` returns the full decorated record by `{id, schoolId}`, i.e. including `aadhaarNumber`, guardian/secondary guardian (phones, emails, Aadhaar), address, documents URLs (schema `Student` 372-405).
- **Impact:** A signed-in parent can fetch any other student in the same school (ids are cuids, but they are exposed in rosters, notices, links) and read minors' Aadhaar numbers, guardian contacts and addresses. Accountant (no teaching/admin need) gets the same. Same-school only; no cross-tenant leak.
- **Reproduction / verification:** code-based; not executed. Safe check on a test school: sign in as a Parent, GET `/api/students/<another student id>` and observe 200 with full fields.
- **Root cause:** Deny-list (`Teacher`) instead of an allow-list on a route whose permission is shared by low-privilege roles.
- **Recommended fix:** In the route, allow only roles that legitimately need the full record: `if (!['Admin','Principal','SuperAdmin'].includes(user.roleKey)) return 403`; Parent already has dedicated parent routes. Consider returning a reduced projection for Accountant.
- **Validation:** Parent/Accountant/Teacher get 403; Admin/Principal 200.
- **Effort:** S   **Dependencies:** authorization auditor (shared RBAC grants); PRV-003

### PRV-002 — Aadhaar and identity documents under permanent unsigned public URLs
- **Category:** Security / Privacy   
- **Severity:** P1   **Confidence:** Medium   **Status:** Suspected (bucket policy not inspected)
- **Affected component:** `lib/storage.js`, `app/api/students/document-upload-url/route.js`, `app/api/teachers/document-upload-url/route.js`
- **Evidence:** `lib/storage.js:20-27` — `buildPublicUrl` returns `${R2_PUBLIC_URL}/${key}` and its comment states the bucket must allow public reads; there is no signed-GET path in the file. Student document keys are `students/<schoolId>/documents/<Date.now()>-<sanitised original filename>` (`students/document-upload-url/route.js:26-28`); teacher equivalent `teachers/document-upload-url/route.js:22-24`. The URL is stored in the DB (`Student.aadhaarDocumentUrl` schema 383, Teacher 629) and returned to API callers (see PRV-001).
- **Impact:** Anyone holding or guessing a URL can download a child's or teacher's Aadhaar/birth-certificate scan with no authentication, no expiry and no access log. Keys are not high-entropy (millisecond timestamp plus a user-chosen filename such as the document type), and URLs leak through any log, referrer, shared screenshot or the PRV-001 route.
- **Reproduction / verification:** code-based; not executed. Confirm in the Cloudflare dashboard whether public access is enabled for the bucket/domain.
- **Root cause:** Reuse of the public-read pattern designed for notice PDFs and profile photos for identity documents.
- **Recommended fix:** Smallest change: keep photos public, but store identity documents under a separate private bucket (no public domain) with a random key (`crypto.randomUUID()`), and serve them via a permission-checked route that returns a short-lived presigned GET (`GetObjectCommand` + `getSignedUrl`, 60-300 s). Existing objects need migration.
- **Validation:** Unauthenticated GET of a document URL returns 403/404; signed link works only for authorised roles and expires.
- **Effort:** M   **Dependencies:** PRV-001, PRV-004

### OBS-003 — Fee-generation cron only processes one fallback school
- **Category:** Backend / Operations   
- **Severity:** P1   **Confidence:** High   **Status:** Confirmed (code-based)
- **Affected component:** `app/api/cron/generate-fees/route.js`, `lib/fees.js:585-607`, `lib/auth/schoolContext.js:18-27`
- **Evidence:** `generateDueStudentFees()` calls `getFeeStructures()` (no school argument); that resolves school through `resolveSchoolId()`, which with no session (a cron has none — the function's own comment at `fees.js:579-583` says so) returns the process-wide `getActiveSchoolId()` singleton (`schoolContext.js:26`, default seed id at `lib/school.js:5,17`).
- **Impact:** On a multi-school deployment the daily job generates term fees for at most one school (whichever the instance last "stepped into", else the seed id); all others are silently skipped while the route returns `success: true`. Parents of other schools are not billed on time; no one is alerted.
- **Reproduction / verification:** code-based; not executed (cron routes must not be called). Read the call chain above; on a DB with two schools only one school's `StudentFee` rows are produced on a cron day.
- **Root cause:** Tenant resolved from ambient state instead of iterating schools explicitly in the job.
- **Recommended fix:** In the cron, `const schools = await prisma.school.findMany({select:{id:true}})` and call a school-parameterised generator for each, collecting per-school success/failure in the response.
- **Validation:** With two seeded schools having due structures, both get fees in one run (on a non-production DB); response lists per-school counts.
- **Effort:** M   **Dependencies:** OBS-005; prior audit P13

### OBS-007 — No Razorpay webhook or reconciliation tooling
- **Category:** Backend / Financial integrity   
- **Severity:** P1   **Confidence:** High   **Status:** Confirmed (code-based)
- **Affected component:** `app/api/payments/razorpay/*`, `lib/fees.js` (~1190-1275)
- **Evidence:** only `create-order` and `verify` routes exist under `app/api/payments/` (directory listing); `lib/fees.js:1191,1257` comments say a webhook is a future addition ("once built"). Payment rows start `PENDING` (`schema.prisma:1437`) and become `SUCCESS` only when the browser/app calls `verify` (`fees.js:1236-1248`). No job re-queries Razorpay for stale `PENDING` rows, and no admin screen lists them. Also `create-order/route.js:13` and `verify/route.js:12` skip the ownership check when no actor is signed in.
- **Impact:** If a parent pays and the app/tab closes, the network drops, or the callback fails, money is captured at Razorpay but the fee stays unpaid and the Payment stays `PENDING` indefinitely; staff must reconcile manually against the Razorpay dashboard. Refunds do not exist either (prior audit P28). The null-actor path lets an unauthenticated caller create orders/PENDING rows against any fee id (signature check still protects `verify`).
- **Reproduction / verification:** code-based; not executed.
- **Root cause:** Client-driven confirmation only.
- **Recommended fix:** Add `POST /api/payments/razorpay/webhook` (verify `X-Razorpay-Signature` with the webhook secret over the raw body; call the existing idempotent confirm path which already tolerates duplicates, `fees.js:1256-1262`), plus a daily/admin "stale PENDING payments" check that fetches the order status. Require a signed-in actor on `create-order`/`verify`.
- **Validation:** Replay a webhook twice (test mode): one SUCCESS row, fee marked once; stale PENDING list is empty after reconciliation.
- **Effort:** M   **Dependencies:** OBS-005

### PRV-003 — Aadhaar, PAN and bank details stored and served in plaintext
- **Category:** Security / Privacy   
- **Severity:** P2   **Confidence:** High   **Status:** Confirmed (code-based)
- **Affected component:** `Student`, `Teacher` models; `lib/teachers.js` `decorateTeacher`
- **Evidence:** `schema.prisma:376` (`Student.aadhaarNumber String`), guardian Aadhaar inside `guardian`/`secondaryGuardian` Json (`lib/students.js:319-333`), `Teacher.aadhaarNumber` (624), `panNumber` (634), `bankDetails Json` (637). `lib/auth/encryption.js` (AES-256-GCM) exists but is used only for the Razorpay key secret (`lib/razorpay.js:4`, `lib/schools.js:2`). `lib/teachers.js:103,110,119` return Aadhaar, PAN and bank details; `GET /api/teachers/paged` (`paged/route.js:18-27`) returns that full decorated shape for every teacher on every page to any holder of `teachers.view` (Admin/Principal).
- **Impact:** A database leak, backup exposure or an over-broad read exposes government IDs and bank accounts directly; list views carry far more than a table needs.
- **Reproduction / verification:** code-based; not executed.
- **Root cause:** Identifiers treated as ordinary profile fields.
- **Recommended fix:** (1) Return a list projection without Aadhaar/PAN/bank from `paged`; fetch sensitive fields only on a detail view. (2) Reuse `encryptSecret`/`decryptSecret` for `aadhaarNumber`, `panNumber` and bank account number, and display masked (last 4) by default. Requires a one-off data migration; search by these fields is not currently offered.
- **Validation:** DB rows hold `iv:tag:cipher` strings; list API has no such fields.
- **Effort:** M   **Dependencies:** PRV-001, PRV-002

### PRV-004 — No erasure/retention path for personal data and documents
- **Category:** Privacy / Data lifecycle   
- **Severity:** P2   **Confidence:** High   **Status:** Confirmed (code-based; legal need requires verification)
- **Affected component:** `lib/students.js:673-698`, teachers routes, storage
- **Evidence:** `deleteStudent` removes the row and only the profile photo object (`students.js:693-696`); Aadhaar, guardian and other document URLs in `documents`/`aadhaarDocumentUrl`/guardian Json are never deleted from R2. A student with any fee/payment row cannot be deleted at all (Restrict, `:686-690`); the suggested alternative is status change, which keeps all personal data. No teacher delete route exists (`app/api/teachers/[id]` has `assignments`, `reset-password`, `status`, `route.js` with PUT only). Only support tickets have a retention job (`lib/support.js:234-254`, 90 days). No data-export (access) function and no anonymisation function were found.
- **Impact:** Personal data of children and staff persists indefinitely, and orphaned identity documents remain publicly reachable (PRV-002) even after a "delete". If the operator must honour deletion/withdrawal requests, there is no supported way to do it.
- **Reproduction / verification:** code-based; not executed.
- **Root cause:** Lifecycle was not designed; deletion handles only the row and photo.
- **Recommended fix:** On delete/transfer-out purge document objects (`documents.*Url`, `aadhaarDocumentUrl`, guardian document URLs) via `deleteObject`; add an `anonymizeStudent` that blanks identifiers but keeps fee/payment rows; define a retention schedule with the school (fee records often have statutory retention — verify).
- **Validation:** After purge, R2 keys are gone and API returns blanks.
- **Effort:** M   **Dependencies:** PRV-002, PRV-005

### PRV-005 — No privacy notice, terms or consent capture
- **Category:** Privacy / Compliance   
- **Severity:** P2   **Confidence:** High   **Status:** Confirmed that none exists in code; compliance conclusion requires legal verification
- **Affected component:** web `app/` and components; mobile `src/`
- **Evidence:** case-insensitive grep for privacy/consent/terms across `app` and `components` finds only fee-term wording; `schoolapp360/src` and `app.json` contain no privacy/consent references. Login pages, parent account creation (`lib/parentAccounts.js`) and student admission forms carry no notice or consent record; there is no consent field in `schema.prisma`.
- **Impact:** The product processes data of minors (DOB, Aadhaar, caste, religion, blood group, guardian contacts). Under the Digital Personal Data Protection Act 2023, personal data of persons under 18 generally requires verifiable parental/guardian consent and a notice; tracking/behavioural monitoring of children is restricted. Whether the school (data fiduciary) or SchoolApp360 (processor) must collect that here, and in what form, is a legal question; code alone shows no mechanism. Not a compliance conclusion. Mobile stores crash data via Sentry (see PRV-006); no ad/behavioural analytics SDKs were found in either `package.json`.
- **Reproduction / verification:** code-based.
- **Root cause:** Feature scope has not covered notices/consent.
- **Recommended fix:** After legal advice: publish privacy notice/terms pages, link from login screens and app stores, add a recorded acceptance (timestamp, version) at parent first-login and a school-level data-processing agreement. Data minimisation: make caste/religion/Aadhaar optional per school.
- **Validation:** Acceptance rows exist; notice reachable unauthenticated.
- **Effort:** M   **Dependencies:** PRV-004

### OBS-001 — No server-side error tracking, request IDs or structured logs (web)
- **Category:** DevOps / Observability   
- **Severity:** P2   **Confidence:** High   **Status:** Confirmed (code-based)
- **Affected component:** web app (`package.json`, `next.config.mjs`, `lib/*`)
- **Evidence:** no Sentry/APM/logging library in `package.json`; no `instrumentation.js`; `next.config.mjs` is empty; grep for `requestId|x-request-id|correlation` in `lib`, `app`, `middleware.js` -> none. All 30 log sites are free-text `console.error('<name> failed', err)` (e.g. `lib/fees.js:567,599,1061`, `lib/pusher.js:35`, cron routes `generate-fees/route.js:21`). The mobile app does have Sentry (`schoolapp360/src/core/sentry.js:10-22`, enabled only by env flags).
- **Impact:** Production errors on API routes and server components (payments, fee generation, notifications) are visible only in Vercel's raw function logs (retention limited by plan); no grouping, alerting, release tagging or per-request tracing; the mobile crash view cannot be correlated to a server error.
- **Reproduction / verification:** code-based; Vercel-side configuration not inspected.
- **Root cause:** Observability not wired.
- **Recommended fix:** `@sentry/nextjs` with `instrumentation.js` + `sendDefaultPii:false` and a `beforeSend` scrubber (see PRV-007); add a tiny `lib/log.js` that emits one JSON line `{level, event, schoolId, route, err: err.message}` and reuse it in the 30 sites; propagate a request id from `middleware.js` (`crypto.randomUUID()` into a response header).
- **Validation:** Throw in a test route -> event appears with route and school tags and no PII.
- **Effort:** M   **Dependencies:** PRV-007

### OBS-004 — Cron endpoints fail open if `CRON_SECRET` is unset
- **Category:** Security / Operations   
- **Severity:** P2   **Confidence:** High   **Status:** Confirmed (code-based)
- **Affected component:** `app/api/cron/generate-fees/route.js:12-15`, `cleanup-support-tickets/route.js:8-11`
- **Evidence:** the check is `if (process.env.CRON_SECRET && authHeader !== ...)`, so with the variable absent the guard is skipped and anyone can GET the route. Whether production sets it was not verifiable.
- **Impact:** If the variable is missing, any internet user can trigger fee generation or delete 90-day-old support tickets (idempotent-ish, but still unintended mass jobs) and obtain per-structure result JSON.
- **Reproduction / verification:** code-based only (cron routes must not be called in this audit).
- **Root cause:** Optional-secret pattern.
- **Recommended fix:** `if (!process.env.CRON_SECRET || authHeader !== \`Bearer ${process.env.CRON_SECRET}\`) return 401`.
- **Validation:** Request without header returns 401 even when env is unset.
- **Effort:** S   **Dependencies:** none

### OBS-005 — Cron/job failures are swallowed
- **Category:** Backend / Operations   
- **Severity:** P2   **Confidence:** High   **Status:** Confirmed (code-based)
- **Affected component:** `lib/fees.js:597-601`, both cron routes
- **Evidence:** per-structure errors are caught and logged with `console.error` then dropped; the route still returns `{success:true, termsProcessed}` (`generate-fees/route.js:19`). Failed terms are not recorded in results, so the Vercel cron dashboard shows success. Idempotency is reasonable (`@@unique([studentId, academicSession, term])`, schema 556) so a re-run is safe.
- **Impact:** A broken structure silently leaves a class unbilled; discovery is by parent complaint.
- **Reproduction / verification:** code-based.
- **Root cause:** No failure accounting or alert channel.
- **Recommended fix:** push `{structureId, term, error: err.message}` into a `failures` array, return HTTP 500 when non-empty, and notify via an alert (Sentry event or admin notification to SuperAdmin).
- **Validation:** Force one failing structure on a test DB: response 500 and alert fires.
- **Effort:** S   **Dependencies:** OBS-001, OBS-003

### OBS-006 — Notification delivery failures are console-only
- **Category:** Backend / Operations   
- **Severity:** P2   **Confidence:** High   **Status:** Confirmed (code-based)
- **Affected component:** `lib/expoPush.js`, `lib/pusher.js`, `lib/adminNotifications.js`, `lib/examNotifications.js`
- **Evidence:** `expoPush.js:41-61` handles `DeviceNotRegistered` by deleting the token (good) but logs every other ticket error and batch failure to console and returns; no receipts check (Expo's receipt API is never queried), no retry. `pusher.js:31-37` and `adminNotifications.js:38-42` swallow errors after `console.error`. In-app notification inserts are separate DB rows so they still exist when push fails.
- **Impact:** Parents can miss fee/notice/homework pushes with no record visible to staff; a misconfigured Expo/FCM credential would fail every push silently until someone reads logs.
- **Reproduction / verification:** code-based.
- **Root cause:** Best-effort design without a failure signal.
- **Recommended fix:** minimum: count failures per run and report them through the Sentry/log helper from OBS-001 with an alert threshold; optional later: query Expo receipts. No queue infrastructure needed.
- **Validation:** Bad Expo credential produces an alert within one send.
- **Effort:** S-M   **Dependencies:** OBS-001

### OBS-008 — Most sensitive actions have no audit trail
- **Category:** Security / Operations   
- **Severity:** P2   **Confidence:** High   **Status:** Confirmed (code-based)
- **Affected component:** whole API
- **Evidence:** audit-style models: `ExamAuditLog` (`schema.prisma:1297`, written via `logExamAudit` from exam/mark/result/schedule libs only), `StudentPromotionLog` (1041), `MonthlyReportActivity` (1565). `ExamAuditLog` is `onDelete: Cascade` from `Exam` (line ~1302), so deleting an exam deletes its audit history. `Payment` has no recorder/actor column (`schema.prisma:1427-1443`), so a cash/UPI payment recorded by staff has no "who". No audit rows for: fee discount apply/remove, fee structure changes, payment collection, user/role creation and role change (`app/api/users/[id]/role/route.js`), password resets (admin, teacher, parent, student portal), student/teacher create-update-delete, bulk import, academic session activation, school settings and branding changes, SuperAdmin "step into school" (`schools/[id]/manage/route.js`), login success/failure, data views of Aadhaar fields.
- **Impact:** Cannot answer "who changed this fee / role / record" after an incident or dispute; no evidence trail for fraud investigation or for responding to a privacy request.
- **Reproduction / verification:** code-based (grep for audit/log model writes outside the three above).
- **Root cause:** Audit was built only for the exam module.
- **Recommended fix:** one generic `AuditLog` model (`schoolId, actorId, actorRole, action, entityType, entityId, meta Json, createdAt`) and a 10-line `logAudit()` helper (same pattern as `lib/examAuditLog.js`), called from the high-value mutation points first: payments/discounts, role changes, password resets, student/teacher delete, settings. Add `recordedBy` to `Payment`. Remove cascade on ExamAuditLog or copy before delete.
- **Validation:** each listed action creates one row with actor.
- **Effort:** M   **Dependencies:** none

### OBS-010 — No backup/restore or incident-response documentation
- **Category:** DevOps / Operations   
- **Severity:** P2   **Confidence:** Medium   **Status:** Not verified
- **Affected component:** operations
- **Evidence:** `docs/` contains only `API-Spec.md`; `README.md` and `docs/` grep for backup/restore/incident/runbook/disaster -> no matches. Database provider backup settings (Supabase) are outside the repo and were not accessible.
- **Impact:** No documented RPO/RTO, restore drill, breach-response contacts or notification procedure; the mobile app and the web app share one database, so a bad migration or data loss affects all schools. Breach-notification duties (if any) need legal confirmation.
- **Reproduction / verification:** not verified; needs access to Supabase/Vercel/R2 consoles.
- **Root cause:** Not yet written.
- **Recommended fix:** one-page runbook: backup tier and retention, last restore test date, who to call, steps to rotate JWT/R2/Razorpay secrets, template for school/parent notification. Do a restore drill into a scratch database.
- **Validation:** Restore drill completed and dated.
- **Effort:** S-M   **Dependencies:** OBS-009

### PRV-006 — Third-party processors and hosting region need a documented basis
- **Category:** Privacy   
- **Severity:** P3   **Confidence:** Medium   **Status:** Not verified
- **Affected component:** Razorpay, Pusher, Expo Push, SMTP, Cloudflare R2, Sentry (mobile), Vercel/Supabase hosting
- **Evidence:** data sent (code-read): Expo push — device token, title, body such as the payment amount, and `data:{type,studentId}` (`lib/fees.js:1006-1012`); notice/homework/exam pushes similar. Pusher — IDs and status only (`lib/support.js:146,180-182,212`), no names or message text. SMTP — teacher invite/reset link emails (`lib/teachers.js:45`, `lib/emailTemplates.js:19+`). Razorpay — fee amount/order data. R2 — photos, identity documents, notice PDFs, support attachments. Mobile Sentry — crash/perf traces (`sendDefaultPii` is not set). `vercel.json:2` pins region `syd1`; the prior audit noted a Supabase Sydney database.
- **Impact:** Indian students' data is processed on infrastructure outside India and by several processors; whether that is permitted and what contracts/notices are required is a legal question (DPDP cross-border rules depend on government notifications). Not concluded here.
- **Reproduction / verification:** hosting regions to be confirmed in provider dashboards.
- **Root cause:** No processor register.
- **Recommended fix:** maintain a short processor/region table in the privacy notice and DPA; confirm R2 jurisdiction and Supabase region; consider India-region hosting if legal advice requires.
- **Validation:** Table reviewed by counsel.
- **Effort:** S   **Dependencies:** PRV-005

### PRV-007 — Unredacted error objects logged; push token in error log
- **Category:** Privacy / Observability   
- **Severity:** P3   **Confidence:** Medium   **Status:** Suspected
- **Affected component:** 30 `console.error` sites
- **Evidence:** `lib/expoPush.js:53-55` logs the recipient Expo push token (a device identifier) on every ticket error; many sites pass the whole `err` object (`lib/fees.js:567,599,1061`, `lib/notices.js:523`, `lib/parentNotifications.js:37`). Prisma error objects can embed query arguments. I did not find a site that logs request bodies, passwords, OTPs or Aadhaar values directly. No redaction layer exists.
- **Impact:** Low today; becomes a PII/identifier leak into log storage if a failing query includes student fields.
- **Reproduction / verification:** code-based.
- **Root cause:** Free-form logging.
- **Recommended fix:** log `err.code`/`err.message` via the helper from OBS-001, drop the token from line 53-55 (log batch index only).
- **Validation:** grep shows no raw `err` objects in logs.
- **Effort:** S   **Dependencies:** OBS-001

### OBS-002 — No error boundaries
- **Category:** Frontend / Observability   
- **Severity:** P3   **Confidence:** High   **Status:** Confirmed
- **Affected component:** `app/`
- **Evidence:** no `error.jsx` or `global-error.jsx` anywhere under `app` (only `app/not-found.jsx`). Same as prior audit P34.
- **Impact:** Unhandled render errors show the framework default page and are not reported anywhere (no hook to Sentry).
- **Reproduction / verification:** code-based.
- **Root cause:** Never added.
- **Recommended fix:** add `app/global-error.jsx` and `app/error.jsx` that call the error reporter and show a friendly retry.
- **Validation:** throw in a page; fallback UI and event appear.
- **Effort:** S   **Dependencies:** OBS-001

### OBS-009 — No health endpoint or DB metrics
- **Category:** DevOps   
- **Severity:** P3   **Confidence:** High   **Status:** Confirmed
- **Affected component:** `app/api`
- **Evidence:** `app/api` has no health/status route (directory listing); no slow-query logging in `lib/db.js:6` (plain `new PrismaClient()`); no latency metrics.
- **Impact:** No external uptime probe target and no DB-liveness signal; latency issues visible only in Vercel's dashboard.
- **Reproduction / verification:** code-based.
- **Root cause:** Not built.
- **Recommended fix:** `app/api/health/route.js` doing `prisma.$queryRaw\`SELECT 1\`` returning 200/503 (no data, no auth); point an uptime monitor at it.
- **Validation:** Probe goes red when DB is unreachable.
- **Effort:** S   **Dependencies:** none

### OBS-011 — Dev-email fallback prints recipient and body to logs
- **Category:** Privacy / Operations   
- **Severity:** P3   **Confidence:** High   **Status:** Confirmed (conditional on SMTP_HOST unset)
- **Affected component:** `lib/email.js:23-34`
- **Evidence:** when `SMTP_HOST` is absent the transport is a stream transport, nothing is sent, and the function `console.log`s `To`, `Subject` and the full text body (password setup/reset links with tokens).
- **Impact:** If production lacks `SMTP_HOST`, invites silently do not deliver while valid password-set links and recipient addresses are written to Vercel logs.
- **Reproduction / verification:** code-based.
- **Root cause:** Dev convenience reachable in production.
- **Recommended fix:** guard with `NODE_ENV !== 'production'`; in production throw so the caller reports failure.
- **Validation:** Production build without SMTP errors instead of logging.
- **Effort:** S   **Dependencies:** none

### OBS-012 — `dev.log` tracked in git
- **Category:** DevOps   
- **Severity:** P3   **Confidence:** High   **Status:** Confirmed
- **Affected component:** repo root
- **Evidence:** `git ls-files` lists `dev.log` (46 KB, committed in the initial commit); `.gitignore` ignores `npm-debug.log*` etc. but not `dev.log`. A count-only grep found no email addresses, "password" or "token" strings. `.env` is correctly untracked and ignored.
- **Impact:** Low: runtime logs in history may later contain data; no secrets found.
- **Reproduction / verification:** `git ls-files dev.log`.
- **Root cause:** Missing ignore rule.
- **Recommended fix:** `git rm --cached dev.log`, add `*.log` to `.gitignore` (owner action; not done here).
- **Validation:** file no longer tracked.
- **Effort:** S   **Dependencies:** none

### OBS-013 — Login abuse limiter is per-instance memory with no alerting
- **Category:** Security / Observability   
- **Severity:** P3   **Confidence:** Medium   **Status:** Confirmed (design limit stated in code)
- **Affected component:** `lib/auth/loginRateLimit.js:1-45`
- **Evidence:** in-memory `Map`; the file header acknowledges weakness on multi-instance serverless and cold starts. No record of failed logins or lockouts is persisted, nothing alerts on credential-spraying.
- **Impact:** Distributed or cold-start-resetting attacks are not slowed reliably and nobody is told they are happening.
- **Reproduction / verification:** code-based.
- **Root cause:** No shared store; accepted trade-off.
- **Recommended fix:** log a structured event on every lockout (Sentry/helper); if the abuse is observed, back the counters with a small Postgres table keyed by account/IP.
- **Validation:** lockout produces an alert-able event.
- **Effort:** S-M   **Dependencies:** OBS-001, OBS-008

### PRV-008 — Realtime channels are public with predictable names
- **Category:** Privacy   
- **Severity:** P4   **Confidence:** Medium   **Status:** Suspected
- **Affected component:** `lib/pusher.js:23-26`, `lib/support.js`
- **Evidence:** channels are `support-school-<schoolId>`, `support-superadmin`, `support-ticket-<ticketId>` (non-`private-`/`presence-` names, so no server auth endpoint is involved); payloads contain only ids/status. Not confirmed whether the client subscribes with an auth endpoint.
- **Impact:** A subscriber who knows a school or ticket id learns that activity occurred (no content). Low.
- **Reproduction / verification:** code-based.
- **Root cause:** Public channels for convenience.
- **Recommended fix:** keep payloads ID-only (as now) or move to `private-` channels with an auth route if content is ever added.
- **Validation:** n/a
- **Effort:** S   **Dependencies:** none

---

## Personal-data inventory (from `prisma/schema.prisma`)

| Subject | Fields (sensitivity) | Storage | Who can read (code-based) |
|---|---|---|---|
| Student (minor) | name, DOB, gender, blood group, nationality, religion, caste, Aadhaar number, Aadhaar document URL, photo, WhatsApp, address, guardian x3 (phone, email, occupation, Aadhaar), emergency contacts, previous school, fee/discount details, birth certificate/SLC URLs | Postgres plaintext, documents on public R2 | Admin/Principal (full); **Parent, Accountant via PRV-001**; Teacher gets 9 roster fields only (`students/route.js:16-26`, `paged/route.js:41-54`), plus DOB/guardian phone/address for own class via `print-details` (`print-details/route.js:29-62`, Class Teacher only) |
| Teacher | DOB, Aadhaar, PAN, bank details, parents' details, qualifications, address, login email | plaintext Json/columns; documents on public R2 | Admin/Principal via `teachers/paged` (full shape) |
| Parent account | email, name, password hash, photo, child links | Postgres, bcrypt hash | own account; staff |
| Payments | amount, method, Razorpay ids | Postgres | staff with fees permissions; no actor column |
| Push tokens | Expo token per owner | Postgres (`pushTokens`) | server only |
| School Razorpay secret | AES-256-GCM encrypted | Postgres | server decrypt only |

Data minimisation notes: Teacher list returns everything; student list for admins also returns the full decorated record (`app/api/students/route.js:34-36`, `getAllStudents`) including Aadhaar and guardian Aadhaar. No bulk export routes for student data exist (only blank bulk-import templates), which limits export risk; fee summary exports at `app/api/fees/students/summary/route.js` were not reviewed.

## Positive observations (verified)

- Teacher roster routes strip to 9 fields at the query level (`students/route.js:16-26,48`) and `[id]` blocks Teacher (`students/[id]/route.js:17`).
- Passwords are bcrypt-hashed; temp-password and teacher-invite tokens are random (`lib/teachers.js:25` 32 random bytes); `passwordSetToken` unique with expiry columns; session cookie is httpOnly, secure in production, 7-day expiry (`lib/auth/session.js:10-20`).
- Razorpay key secrets encrypted at rest (`lib/auth/encryption.js`); Razorpay confirmation is idempotent on payment id (`lib/fees.js:1256-1262`).
- Support-ticket retention job with R2 attachment cleanup exists (`lib/support.js:234-254`).
- Realtime (Pusher) payloads carry ids only; push bodies contain no names (fee push uses amount only).
- `.env` is untracked and git-ignored; no analytics/advertising SDK is present in either `package.json` (no behavioural tracking observed).
- Exam module has an audit log with actor, role, action and meta (`schema.prisma:1297-1311`); cron routes at least check a bearer secret when configured; fees generation is unique-constrained so re-runs are safe.

## Limitations / not assessed

- Production/Vercel/Supabase/Cloudflare/Razorpay dashboard settings (bucket public access, backups, log retention, alerts, env vars, hosting regions): not accessible; marked Not verified.
- Legal compliance (DPDP Act 2023, children's data, cross-border transfer, breach notification, retention periods): cannot be concluded from code; items framed for legal review.
- No HTTP, DB or cron execution was performed. Fee summary/CSV export route and some parent routes were only sampled.
- Mobile app reviewed only for Sentry and consent text; its local data storage and permissions are outside this report.
- Verification fragment note: while checking whether `.env` carries the "demo" label I displayed a prefix of one secret line in my tool output; no value is reproduced in this report, but the JWT secret should be rotated as a precaution regardless (also prior audit P15).
