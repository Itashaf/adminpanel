# 01 - Repository and Architecture Discovery (Auditor A1)

## Scope
Phase-zero discovery of `ADMIN` (`C:\Users\Tashaf\Desktop\SchoolMS\adminpanel`) and a structural look at `MOBILE` (`..\schoolapp360`). Covers tech stack, structure, auth/session overview, storage, notification infrastructure, docs, a feature implementation-status table and an environment-variable inventory. Read-only; code-based unless stated.

## Method
- Read `package.json`, `package-lock.json` (xlsx entry), `vercel.json`, `next.config.mjs`, `middleware.js`, `lib/db.js`, `lib/auth/*`, `lib/rbac.js`, `lib/iam.js`, `lib/storage.js`, `lib/email.js`, `lib/pusher.js`, `lib/expoPush.js`, cron routes, `prisma/schema.prisma` (headers + model/enum names), `prisma/migrations`.
- Globs/greps across `app`, `lib`, `components` for route handlers, pages, loading/error files, `process.env.*`, `globalThis`, and import references.
- Next.js version is 16.3.2. Consulted `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` (line 11: `middleware` is deprecated and renamed `proxy`; changelog line 774: Proxy defaults to Node.js runtime in v16.0.0).
- Feature status below is from tracing UI page -> API route -> lib -> Prisma model by reading code. Nothing was executed against the app; no runtime verification except where noted.
- Counts verified with `find`/`wc`: 180 `route.js`, 70 `page.jsx`, 74 `lib/*.js` (incl. subdirs, 5 more in `lib/auth`, `lib/hooks`, `lib/performance`), 283 component `.jsx`, 40 `loading.jsx`, 1 `not-found.jsx`, 0 `error.jsx`/`global-error.jsx`, 52 Prisma models, 31 enums.

## Summary of findings

| ID | Sev | Conf | Title | Component |
|---|---|---|---|---|
| ARC-001 | P1 | Medium | Student documents (birth cert, Aadhaar, SLC) uploaded to a public-read R2 prefix with predictable keys | Storage / privacy |
| ARC-002 | P2 | High | No Razorpay webhook: payment recording depends on the browser returning to the verify endpoint | Fees / payments |
| ARC-003 | P3 | High | `middleware.js` uses the file convention deprecated in Next 16 (renamed `proxy`) | Framework |
| ARC-004 | P3 | High | No `error.jsx` / `global-error.jsx` anywhere in `app/` | Frontend resilience |
| ARC-005 | P3 | Medium | `GeneratedReportJob` model (and 3 seed-data libs, 8 components) are dead | Schema / repo |

(See `12-architecture-and-maintainability-audit.md` for MNT-xxx and `10-devops-and-production-readiness.md` for OPS-xxx.)

---

## 1. Tech stack (verified from `package.json` / lockfile)

| Layer | Choice | Version |
|---|---|---|
| Framework | Next.js App Router (Turbopack dev) | 16.3.2 |
| UI | React / react-dom | 19.2.8 |
| Language | Plain JavaScript (`.js`/`.jsx`, `jsconfig.json`), no TypeScript | - |
| Styling | Tailwind CSS 4 + `@tailwindcss/postcss` | ^4 |
| ORM / DB | Prisma Client + CLI, PostgreSQL | 6.19.3 (pinned) |
| Auth | `jose` HS256 JWT in cookie or Bearer header, `bcryptjs` | jose ^6.2.10, bcryptjs ^3.0.3 |
| Forms / validation | react-hook-form + @hookform/resolvers + zod | ^7.86 / ^5.9 / ^4.4 |
| Payments | `razorpay` SDK (per-school keys) | ^2.9.8 |
| Realtime | `pusher` (server) + `pusher-js` (browser), used only for Support tickets | ^5.3.4 / ^8.6.0 |
| Mobile push | Expo Push HTTP API (raw `fetch`, no SDK) | - |
| Email | `nodemailer` (SMTP, console fallback) | ^10.0.1 |
| Storage | Cloudflare R2 via `@aws-sdk/client-s3` + presigner | ^3.1128 |
| Spreadsheets | `xlsx` (SheetJS) from CDN tarball | 0.20.3 |
| Charts / icons | chart.js + react-chartjs-2; react-icons (223 importing files) | - |
| Lint | eslint 9 + `eslint-config-next/core-web-vitals` | 16.3.2 |
| Hosting | Vercel, region `syd1`, 2 crons (`vercel.json`) | - |

Mobile (`schoolapp360`): Expo ~57, React Native 0.86.3, React 19.2.3, Redux Toolkit, React Navigation 7, NativeWind, `@sentry/react-native` ~7.11, `react-native-razorpay`, `expo-notifications`, jest ~29.7 + `@testing-library/react-native`. 104 files under `src/`, own git repo (55 tracked files, 67 working-tree changes).

## 2. Directory structure and routing

```
adminpanel/
  app/
    layout.jsx, page.jsx (login redirect), not-found.jsx, globals.css
    login/ forgot-password/ set-password/ setup/        public auth pages
    dashboard/   (SchoolAdmin/Teacher/Principal/Accountant) 52 page.jsx
    parent/      (Parent portal) with (home) and exams/(list) route groups
    super-admin/ (SuperAdmin: schools, admins, users, support)
    actions/auth.js   the ONLY Server Actions file (login/logout actions)
    api/**/route.js   180 route handlers across 34 top-level resources
  components/  283 .jsx, grouped by domain (students, fees, exams, ...)
  lib/         74 modules: domain data layer + auth/ hooks/ performance/
  prisma/      schema.prisma (1,775 lines), seed.js, migrate-rbac.js, rbacPermissions.js, migrations/ (1 file)
  middleware.js  root-level (deprecated convention, see ARC-003)
  store/ scripts/  both empty
  docs/API-Spec.md, README.md (create-next-app boilerplate), design.md, SKILL.md (1,228 lines)
```

- **Route groups:** only `(home)` and `exams/(list)` under `/parent`. Separation is by top-level segment (`dashboard`, `parent`, `super-admin`), not by group.
- **Layouts:** `app/layout.jsx`, `app/dashboard/layout.jsx` (loads both `getCurrentUser()` and `getCurrentUserInfo()`), `app/parent/layout.jsx`, `app/super-admin/layout`-equivalent. Feature gating via `lib/featureFlagGuard.js` (flags: fees, exams, homework, leave).
- **Loading boundaries:** 40 `loading.jsx` files. **Error boundaries:** none (ARC-004).
- **Middleware (`middleware.js`):** matcher covers `/api/:path*`, `/dashboard`, `/super-admin`, `/parent`, `/`, `/login`, `/forgot-password`. For `/api/*` it only adds CORS headers (`Access-Control-Allow-Origin: *`, lines 56-67) and answers OPTIONS; it performs NO authentication for APIs. Page-level gate: verifies JWT and redirects by role. All API authorization is therefore per-handler.
- **Route handlers vs server actions:** 180 route handlers carry all data mutations; server actions are used only for the five login/logout flows in `app/actions/auth.js`. Client components call `lib/api.js` (2,181 lines, 190 exported fetch wrappers) which hits the route handlers.

### Route-handler authorization coverage (code-based grep, 180 handlers)
- 101 use `requirePermission`, 13 `requireSuperAdmin`, 60 `getCurrentUserInfo`, 2 cron-secret handlers.
- Only 3 handlers contain no recognizable guard keyword: `auth/parent/login` (expected public), and `students/bulk-import/template` + `blank-template` (static Excel templates; both call `resolveSchoolId()` per grep of related code but need a closer review by the auth auditor). This is a large improvement over the previous audit's "~10 unauthenticated mutating routes" claim, which I did NOT reproduce; a keyword match is not proof of correct per-route checks, which belongs to the auth/authorization auditors.

## 3. Prisma schema overview
- `provider = "postgresql"`, `url = env("DATABASE_URL")` only (no `directUrl`), `binaryTargets = ["native","rhel-openssl-3.0.x"]` (`prisma/schema.prisma:14-21`).
- 52 models, 31 enums. Domains: identity/RBAC (`SuperAdmin`, `SchoolAdmin`, `User`, `Role`, `Permission`, `RolePermission`, `ParentAccount`, `ParentStudentLink`), tenant (`School`), people (`Student`, `Teacher`, `StudentEnrollment`, `StudentPromotionLog`), academics (`Class`, `Section`, `Subject`, `TimeTable`, `AcademicSession`, `CalendarEvent`), attendance (`Attendance`, `TeacherAttendance`, `TeacherLeave`), exams (`Exam`, `ExamSchedule`, `ExamMark`, `ExamResult`, `ExamAuditLog`, `GradeScale`, `ExamOptionalEnrollment`), fees (`FeeStructure*`, `StudentFee*`, `Payment`), performance reports (`SubjectTest*`, `MonthlyReport*`, `YearlyReport`, `ReportLock`, `GeneratedReportJob`), comms (`Notice`, `Homework`, `PushToken`, `ParentNotification`, `TeacherNotification`, `AdminNotification`), support (`SupportTicket`, `SupportTicketReply`).
- 49 `@@index`/`@@unique` declarations. `Payment.razorpayOrderId` and `razorpayPaymentId` are `@unique` (`schema.prisma:1438-1439`), which gives DB-level duplicate-payment protection.
- **Migrations:** single migration `20260830172048_init` of 38 lines creating only `SuperAdmin` and `SchoolAdmin`. The other 50 models are not covered by any tracked migration (OPS-003).

## 4. Auth and session mechanism (overview; depth belongs to auth auditor)
- JWT HS256, 7-day expiry, signed with `JWT_SECRET` (`lib/auth/jwt.js:1-27`). Payload is trusted verbatim; not re-derived from DB on every request (comment lines 12-14).
- Cookie `schoolapp360_session`, `httpOnly`, `secure` in production, `sameSite: 'lax'` (`lib/auth/session.js:10-20`). `getSession()` falls back to `Authorization: Bearer` for mobile (`session.js:30-39`).
- Logins: Server Actions for SuperAdmin/SchoolAdmin/Teacher/Parent (`app/actions/auth.js`), plus REST `api/auth/{parent,teacher,staff}/login` for mobile. In-memory rate limiter (`lib/auth/loginRateLimit.js`, see OPS-005).
- RBAC: `lib/rbac.js` exposes `requireAuth/requireRole/requirePermission/requireAnyPermission`; permission keys seeded from `prisma/rbacPermissions.js`; roles `Principal/Admin/Accountant/Teacher/SuperAdmin/Parent`.
- **Dual identity model:** legacy `role` (SuperAdmin/SchoolAdmin/Teacher/Parent) plus newer `roleKey`, and two "current user" resolvers (`lib/currentUser.js` demo toggle and `lib/iam.js`). Covered in MNT-001/MNT-002.

## 5. Upload / storage (R2)
- `lib/storage.js`: new `S3Client` per call; `getPresignedUploadUrl` (PUT, 300 s expiry, `ContentType` signed but no `ContentLength`/size condition), `deleteObject` (swallows errors), `listObjectKeysWithPrefix`, `buildPublicUrl` (`${R2_PUBLIC_URL}/${key}`).
- 10 presign routes (`admin|parent|teacher/profile-photo-upload-url`, `school/logo-upload-url`, `students/{photo,document}-upload-url`, `teachers/{photo,document}-upload-url`, `notices/upload-url`, `support/upload-url`). The type and size checks use client-declared `fileType`/`fileSize` (`students/document-upload-url/route.js:19-25`), so a client can lie about the size and upload anything of the declared content-type.
- No signed GET URLs: all reads go straight to a public bucket URL (`storage.js:20-26` comment: bucket "already set to allow public reads").

### ARC-001 - Student documents stored in a public-read bucket with guessable keys
- **Category:** Security / Privacy  
- **Severity:** P1   **Confidence:** Medium   **Status:** Suspected (code-based; bucket ACL/config not verified)
- **Affected component:** Student document uploads (father/mother photo, birth certificate, SLC, Aadhaar), notices attachments, support attachments
- **Evidence:** `lib/storage.js:20-26` (public URL, comment requires public-read bucket); `app/api/students/document-upload-url/route.js:28` key = `students/<schoolId>/documents/<Date.now()>-<safeName>`; `app/api/support/upload-url/route.js:33` same pattern; `route.js:19-25` size/type trusted from the client.
- **Impact:** identity documents of minors/parents are readable by anyone who obtains or guesses the URL (millisecond timestamp plus a usually predictable filename such as `aadhaar.pdf`); the URL is persisted and returned to every client that renders the student. No access revocation or audit is possible; deleting a student does not necessarily delete the object. This is a privacy/regulatory exposure (India's DPDP Act for children's data).
- **Reproduction / verification:** code-based; not executed. To confirm: check R2 bucket public-access setting and whether `R2_PUBLIC_URL` is an `r2.dev`/custom domain with public read.
- **Root cause:** public-bucket design chosen for simplicity of display; keys carry no unguessable component.
- **Recommended fix:** minimum: add `crypto.randomUUID()` to every key. Better: keep sensitive prefixes (`students/*/documents/`, Aadhaar) in a private bucket and serve through an authenticated route that returns a short-lived presigned GET (`@aws-sdk/s3-request-presigner` is already installed). Also pass `ContentLength` via a presigned POST policy or re-check the object size with `HeadObject` on confirm.
- **Validation:** unauthenticated GET of a stored document URL returns 403; authenticated route returns 200 with expiring URL.
- **Effort:** M   **Dependencies:** data migration of existing keys; MNT-003.

## 6. Notifications and jobs
| Mechanism | Implementation | Retry / durability |
|---|---|---|
| Expo push | `lib/expoPush.js` batches of 100, `Promise.all`; deletes token on `DeviceNotRegistered`; logs other errors | Fire-and-forget, no retry, no receipts check |
| Pusher | `lib/pusher.js` lazy singleton; only Support tickets channels (`support-school-*`, `support-superadmin`, `support-ticket-*`) | Best-effort |
| Email | `lib/email.js` nodemailer; no `SMTP_HOST` => message only logged to console (comment says production provider is a deferred decision) | No retry, no queue |
| In-app notifications | DB tables `ParentNotification`, `TeacherNotification`, `AdminNotification` written by `lib/*Notifications.js` | Durable (DB) |
| Crons | `vercel.json`: `/api/cron/generate-fees` 03:00 UTC, `/api/cron/cleanup-support-tickets` 04:00 UTC; both GET with optional bearer check | See OPS-001 |
No queue/outbox exists. A serverless function that returns before the `fetch` to Expo/Pusher resolves may drop the send (no `waitUntil`/`after` used: grep found none).

## 7. Mobile app existence/structure
`..\schoolapp360`: Expo app, `src/{api,components,core,features,hooks,theme,utils}`, `App.js`, `android/` native project, Sentry wired in `src/core/sentry.js` (enabled only when `EXPO_PUBLIC_ENABLE_CRASH_REPORTING==='true'` and a DSN is set), `jest.config.js` + `jest.setup.js`, 0 test files, many root-level docs (`ARCHITECTURE.md`, `SETUP.md`, `TEST_FIX.md`, `PROJECT_SETUP_SUMMARY.md`, `README_COMPLETE.md`, ...). The jest config is currently broken (see 09 report TST-002).

## 8. Existing documentation
| Doc | State |
|---|---|
| `README.md` (36 lines) | create-next-app boilerplate; no setup, env, deploy or architecture info |
| `docs/API-Spec.md` (1,175 lines) | Detailed endpoint spec; line 1147 says one ledger route does not reject unauthenticated callers with 401 - must be re-verified before use as truth |
| `SKILL.md` (1,228 lines) | Agent-oriented project description; the only real architecture narrative; line 818+ describes login behaviour that predates current code |
| `design.md` (115 lines) | design tokens/UI guidance |
| `AUDIT_REPORT.md` / `ISSUE_CHECKLIST.md` (+PDF) | Prior audit (score 42/100). Not copied; findings referenced by other auditors. Spot check: `lib/auth.js` no longer holds hardcoded credentials; `prisma/seed.js:88` now takes `SUPER_ADMIN_SEED_PASSWORD` or a random value. Residual: a plaintext password remains in a code comment (OPS-015 in report 10). |
| `EXAM_MODULE_UI_PROMPT.md` | prompt notes |
| Architecture / runbook / ER diagram | absent (MNT-007) |

## 9. Dependency and architecture map

```
Browser (Client Components, react-hook-form + zod)
   |  lib/api.js (fetch wrappers, 190 fns)             Mobile app (Bearer JWT)
   v                                                    v
middleware.js  --(pages: JWT role redirect; /api: CORS only)--
   |
app/api/**/route.js (180)  -- requirePermission / getCurrentUserInfo / requireSuperAdmin
   |
lib/<domain>.js  (students, fees, exams, attendance, notices, ...)   lib/rbac.js, lib/iam.js, lib/auth/*
   |                                    |-- lib/razorpay.js (per-school keys, AES-GCM at rest: lib/auth/encryption.js)
   v                                    |-- lib/storage.js -> Cloudflare R2
lib/db.js (globalThis PrismaClient) --> PostgreSQL (DATABASE_URL)
                                        |-- lib/pusher.js, lib/expoPush.js, lib/email.js
Server Component pages (app/dashboard/**, app/parent/**) call lib/* directly (skipping route handlers)
Crons (vercel.json) -> /api/cron/* -> lib/fees.js, lib/support.js
```
Layering is mostly pages -> lib -> prisma. `lib/*Constants.js` files are intentionally client-safe; several lib files must not import server-only modules (documented in comments of `lib/school.js` and `lib/featureFlags.js`), an import-hygiene constraint enforced only by comments.

## 10. Feature implementation status
Legend: Fully / Partially / Mocked / Duplicated / Unused / Missing / Cannot verify. Code-read, not executed.

| Feature | Status | Trace evidence | Notes |
|---|---|---|---|
| Students (CRUD, list, bulk import, print details) | Fully | `app/dashboard/students/*`, `app/api/students/{route,paged,bulk-import,print-details}`, `lib/students.js` (931 lines), `Student` model | Server-side pagination via `students/paged`. |
| Enrollment and promotion | Partially | `app/dashboard/students/promote`, `api/students/promote`, `lib/students.js:738 promoteStudents`, models `StudentEnrollment`, `StudentPromotionLog`, `AcademicSession` | Implemented; no automated test, rollback/undo of a promotion not found (grep). |
| Teachers / staff | Fully | `app/dashboard/teachers/*`, `api/teachers/*`, `lib/teachers.js`, teacher login | |
| Classes / sections / subjects / sessions | Fully | `app/dashboard/{classes,academics,sessions}`, `lib/classes.js`, `lib/subjects.js`, `lib/academicSessions.js` | Three seed-data libs for these are unreferenced (dead). |
| Student attendance | Fully | `app/dashboard/attendance/{daily,reports}`, `api/attendance/*`, `lib/attendance.js`, lock/unlock `api/attendance/[id]/lock` | Teacher scope check in route. |
| Staff attendance | Fully | `dashboard/attendance/staff`, `api/staff-attendance`, `lib/teacherAttendance.js`, `TeacherAttendance` model, `TeacherCheckInCard` | Location helper `lib/location.js`. |
| Exams / marks / results | Fully (workflow) | `dashboard/{exams,marks-entry}`, `api/exams/[id]/{verification,results,status,audit-log,duplicate,schedules}`, `lib/exams*.js`, `lib/examMarks.js`, `ExamAuditLog` | Marks -> verify -> publish present; transitions untested. |
| Report cards | Partially | `dashboard/print-marksheet`, `api/print-marksheet`, `lib/printMarksheet.js`; monthly/yearly performance reports under `dashboard/performance/*` | `GeneratedReportJob` model has no code references (unused; background generation never built). |
| Fees / payments / discounts / late fees | Fully, with gap | `dashboard/fees/*`, `api/fees/*`, `api/payments/*`, `lib/fees.js` (1,728 lines), `lateFee*` fields, `DiscountModal` | Online payment relies on client-return verify; no webhook (ARC-002). Cron auto-generates term fees. |
| Timetable | Fully | `dashboard/academics/timetable`, `api/timetable`, `lib/timetable.js`, `TimeTableClient.jsx` (1,023 lines) | |
| Homework | Fully | `dashboard/homework`, `api/homework/{route,page}`, `lib/homework.js`, parent view | Feature flag `homework`. |
| Notices / notifications | Partially | `dashboard/notices`, `api/notices/{page,paged,upload-url}`, `lib/notices.js`, `lib/expoPush.js`, notification tables | `notices/page` and `notices/paged` are two near-duplicate list endpoints (the `page` route comment says `paged` is kept for the mobile app). No retries. |
| Support tickets | Fully | `super-admin/support`, `api/support/tickets`, `lib/support.js`, Pusher, cleanup cron | Newest module; untested. |
| Leaves | Partially | `dashboard/leave`, `api/leaves`, `lib/teacherLeaves.js`, `TeacherLeave` | Teacher leave only; no student/parent leave found. |
| Calendar | Fully | `dashboard/academics/calendar`, `api/calendar-events`, `api/{parent,teacher}/calendar-events` | |
| Reports / exports | Partially | Attendance report table, performance report import templates (`xlsx`), student bulk-import templates | Import templates and tables exist; no generic export/CSV download service found; Cannot verify PDF export (`print-marksheet` is browser print). |
| RBAC / roles | Partially | `lib/rbac.js`, `dashboard/settings/roles`, `api/{roles,permissions,users,iam}`; 101/180 handlers use `requirePermission` | Dual legacy `role` + `roleKey`; `middleware.js:22-37` itself says the roleKey path is "not yet reachable". |
| Multi-school / tenant model | Partially | `School` model, `schoolId` on tenant tables, `resolveSchoolId()` from session | Process-global `ACTIVE_SCHOOL` fallback (MNT-001); cross-tenant tests absent. |
| Parent portal | Fully | `app/parent/*` (home, attendance, calendar, exams, fees w/ Razorpay card, homework, notices, profile), `api/parent/*`, `ParentStudentLink` | |
| SuperAdmin | Fully | `app/super-admin/{schools,admins,users,support}`, `api/schools/*` (per-school Razorpay config, feature flags, manage/step-in) | "Manage this school" step-in mutates process-global state (MNT-001). |
| Online fee webhook | Missing | no route under `api/payments/razorpay` besides `create-order` and `verify`; comment at `lib/fees.js:1257` says "a webhook, once built" | ARC-002 |
| Email delivery | Partially | `lib/email.js` falls back to console log without SMTP_HOST | Production provider unconfigured/unknown. |

### ARC-002 - No Razorpay webhook; successful payments depend on the browser/app calling verify
- **Category:** Backend / Financial integrity
- **Severity:** P2   **Confidence:** High   **Status:** Confirmed (code-based)
- **Affected component:** Online fee payment
- **Evidence:** `app/api/payments/razorpay/` contains only `create-order/route.js` and `verify/route.js`; `lib/fees.js:1194-1265` `verifyRazorpayPayment` is idempotent (SUCCESS short-circuit at ~1214, unique `razorpayPaymentId` P2002 handling at ~1257-1262) but only runs when the client calls it; the comment at 1257 anticipates a webhook "once built".
- **Impact:** if a parent pays and the app/browser dies, loses network, or the tab closes before `verify`, Razorpay captured the money while the `Payment` row stays `PENDING` and the fee stays unpaid. Schools see disputes and manual reconciliation. Double-submit safety is good; lost-callback safety is absent.
- **Reproduction / verification:** code-based; not executed.
- **Root cause:** reconciliation designed as client-driven only.
- **Recommended fix:** add `app/api/payments/razorpay/webhook/route.js` (raw body, `X-Razorpay-Signature` HMAC with a per-school webhook secret, handle `payment.captured`/`order.paid`), reusing the existing idempotent finalize logic from `verifyRazorpayPayment`. Add a nightly reconcile of PENDING payments older than 30 min via Razorpay `orders.fetchPayments`.
- **Validation:** replay the same webhook twice -> one SUCCESS payment, fee paid once; simulate closing the tab -> fee becomes PAID from the webhook.
- **Effort:** M   **Dependencies:** per-school webhook secret storage next to `razorpayKeySecretCipher`.

### ARC-003 - `middleware.js` uses the deprecated file convention
- **Category:** Backend / Framework
- **Severity:** P3   **Confidence:** High   **Status:** Confirmed
- **Affected component:** `middleware.js`
- **Evidence:** `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md:11` (deprecated, renamed `proxy`); `middleware.js:75` exports `middleware` and a `config.matcher`.
- **Impact:** still functional in 16.3.2 (verified only by the existence of a running dev log; not tested) but will break on a future major; the Edge-runtime assumption in the file's comment (line 3-5) no longer matches Proxy's Node.js default.
- **Reproduction / verification:** code/doc-based.
- **Root cause:** project predates Next 16 rename.
- **Recommended fix:** `npx @next/codemod@canary middleware-to-proxy .` (docs: `version-16.md` codemods) when convenient; rename function to `proxy`.
- **Validation:** redirects for `/dashboard` without cookie still work.
- **Effort:** S   **Dependencies:** none.

### ARC-004 - No error boundaries (`error.jsx`, `global-error.jsx`)
- **Category:** Frontend
- **Severity:** P3   **Confidence:** High   **Status:** Confirmed
- **Evidence:** `find app -name error.jsx -o -name global-error.jsx` returned nothing; only `app/not-found.jsx` exists. 40 `loading.jsx` files exist.
- **Impact:** any thrown error in a Server Component (e.g. a Prisma timeout inside `app/dashboard/layout.jsx`, which awaits several DB reads) shows Next's default error page with no recovery link and no place to hook error reporting.
- **Reproduction / verification:** code-based.
- **Root cause:** never added.
- **Recommended fix:** add `app/error.jsx` and `app/global-error.jsx` (client components with a retry button) and ship the error to the logging solution chosen in OPS-007.
- **Validation:** throw inside a page in dev and confirm the boundary renders.
- **Effort:** S   **Dependencies:** OPS-007.

### ARC-005 - Dead schema/code: `GeneratedReportJob`, three seed-data libs, eight components
- **Category:** Other
- **Severity:** P3   **Confidence:** High   **Status:** Confirmed (reference grep)
- **Evidence:** no reference to `generatedReportJob` in `app/` or `lib/`; `lib/{classSeedData,studentSeedData,teacherSeedData}.js` (1,206 lines total) not imported anywhere; unreferenced components: `academics/ComingSoonCard`, `academics/TimeTablePeriodModal`, `dashboard/{ClassOverviewSection,RecentActivityCard,RecentStudentsTable,SmartAlertsCard,StudentOverviewCard,WelcomeBanner}`.
- **Impact:** noise, misleading status (a "report generation job" table suggests a feature that does not exist), bundle-agnostic but review cost.
- **Reproduction / verification:** `grep -rlE "[/'\"]<name>['\"]"` over `app lib components prisma`.
- **Root cause:** progressive migration from in-memory to Postgres left leftovers.
- **Recommended fix:** delete after a human confirms; drop the model in a real migration (see OPS-003).
- **Validation:** `npx eslint .` and a build still pass.
- **Effort:** S   **Dependencies:** OPS-003.

## 11. Environment-variable inventory (names only)
Names found by `grep process.env.` in `app lib components middleware.js prisma` plus `env()` in `schema.prisma`. "Present in local .env" means the NAME exists in the local `.env` (values not read).

| Variable | Used in | Validated at startup? | Failure mode |
|---|---|---|---|
| `DATABASE_URL` | `prisma/schema.prisma:20` | No (Prisma fails at first query) | Runtime 500 |
| `JWT_SECRET` | `lib/auth/jwt.js` | No; throws lazily on first sign/verify; `verifySessionToken` swallows the throw and returns null (`jwt.js:24-26`), so a missing secret silently logs everybody out | Silent auth failure |
| `ENCRYPTION_KEY` | `lib/auth/encryption.js` (64-hex check, lazy) | Lazy | Payment setup/checkout throws |
| `CRON_SECRET` | both cron routes | **Not set in local .env**; optional by design (fail-open) | Cron endpoints open (OPS-001) |
| `SUPER_ADMIN_SEED_PASSWORD` | `prisma/seed.js` | n/a (random fallback printed to console) | |
| `NEXT_PUBLIC_APP_URL` | `lib/auth/...` / emails | No | Broken links in emails |
| `SMTP_HOST/PORT/USER/PASS/FROM/SECURE` | `lib/email.js` | No; unset => console log transport | Mail silently not sent |
| `R2_ACCOUNT_ID/ACCESS_KEY_ID/SECRET_ACCESS_KEY/BUCKET_NAME/PUBLIC_URL` | `lib/storage.js` | No | Upload/delete fail at runtime (delete swallowed) |
| `PUSHER_APP_ID/KEY/SECRET/CLUSTER` | `lib/pusher.js` | No | Best-effort failures |
| `NEXT_PUBLIC_PUSHER_KEY/CLUSTER` | `lib/pusherClient.js` | No (build-time inlined) | Realtime off |
| `NODE_ENV` | `lib/auth/session.js` (cookie `secure`) | Framework | |
Razorpay keys are NOT environment variables: they are per-school in the DB (encrypted). No `.env.example` exists in ADMIN. No schema-based env validation exists anywhere.

## Positive observations
- Per-school Razorpay keys with AES-256-GCM at rest and constant-time signature compare (`lib/razorpay.js:46-54`).
- `Payment.razorpayPaymentId`/`razorpayOrderId` unique constraints plus transactional update.
- Auth guard keyword coverage is high (177 of 180 handlers).
- Clean `lib/*Constants.js` split to keep client bundles free of server code.
- `.env*`, `*.pem`, firebase admin JSON and keystore are git-ignored; no secret files are tracked in ADMIN (verified with `git ls-files`).

## Limitations / not assessed
- Runtime behaviour was not exercised; `localhost:3000` GET probes were not made in this report.
- R2 bucket ACL, Vercel project settings, production env values, and database size/indexes not accessible.
- Circular-import detection tool not run (no madge installed; avoided installing).
- Feature statuses marked Fully mean "path exists end to end in code", not "correct".
