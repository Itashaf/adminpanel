# 04 - Security and tenant isolation (auditor A4)

## Scope
Authentication (web server actions, mobile token routes, reset/invite tokens, JWT/cookie), authorization (lib/rbac.js, lib/iam.js, lib/roleGuard.js, lib/auth/schoolContext.js, middleware.js), tenant isolation across all 180 route handlers and the dashboard server pages, privilege escalation through role/user endpoints. Companion: 07-security-risk-register.md. Findings JSON: _findings/a4.json.

## Method (sampling)
- Inventoried every file under app/api (180) with a script that strips comments, then detects real guard calls; the table below is generated, then hand-annotated for the risky rows.
- Read in full: middleware.js, lib/iam.js, lib/rbac.js, lib/rbacConstants.js, lib/auth/*.js, lib/currentUser.js, lib/roleGuard.js, app/actions/auth.js, prisma/rbacPermissions.js, all login routes, users/roles routes, the five A3-reported unauthenticated handlers, support, homework, marks, timetable, print-marksheet, cron routes.
- Swept all of lib/ and app/ with grep for prisma update/delete/findUnique-by-id calls lacking schoolId, then read the surrounding function for each hit (about 45 hits; most are preceded by a schoolId-scoped lookup).
- Checked dashboard pages (49) for server-side guards.

## What was verified vs only read
All results are **code-based**. The local dev server was not running (curl to localhost:3000 failed), so no HTTP verification was possible; nothing was executed against any database.

## Summary table
| ID | Sev | Conf | Title | Component |
|---|---|---|---|---|
| SEC-001 | P1 | High | Any signed-in Parent (and Accountant) can write homework and exam marks: routes only require a non-null actor and libs treat every non-Teacher as admin | homework + exam marks APIs |
| SEC-017 | P1 | High | API-001 fallback actor also reaches write paths: support ticket replies/reads are unscoped when actor.schoolId is undefined; marks and homework run as the toggle Teacher | lib/iam.js, lib/support.js, support API |
| SEC-004 | P1 | High | Process-global tenant and role singletons are mutated by every school-admin/teacher login, so SuperAdmin and session-less requests act on whichever school logged in last | lib/school.js, lib/currentUser.js, auth actions |
| SEC-002 | P1 | Medium | Dashboard server pages have no server-side role/permission guard: a signed-in Teacher can render Teachers, Fees, Settings and Promote pages with SSR data | dashboard pages (teachers, fees, settings, promote) |
| SEC-003 | P2 | High | No session revocation: deactivated users, disabled teachers, deactivated admins and suspended schools keep access until the 7-day JWT expires | session lifecycle |
| SEC-005 | P2 | High | PUT /api/users/[id] has no role-hierarchy check: an Admin can deactivate or re-email a Principal; status is not validated | users API |
| SEC-006 | P2 | High | Parent role holds permissions that expose school-wide data: class attendance rosters, defaulter ids, all-class rosters | attendance roster, fees defaulters, print-marksheet |
| SEC-010 | P3 | High | Set-password link: no server-side password policy, 7-day plaintext token, no redemption throttling, no status re-check; reset only exists for teachers | lib/teachers.js, prisma Teacher |
| SEC-011 | P3 | High | Login rate limiter is bypassable and enables targeted lockout: client-controlled x-forwarded-for first hop, per-instance memory, 8-attempt per-account counter | lib/auth/loginRateLimit.js |
| SEC-012 | P3 | Medium | Cross-tenant reference gaps: section update not tied to class, classTeacherId and marks studentId not validated against the school | lib/classes.js, lib/examMarks.js |
| SEC-013 | P3 | Medium | Login lookups by email are global while uniqueness is per school or absent, so same-email accounts collide | login lookups |
| SEC-016 | P3 | Medium | Push token registration transfers ownership of an existing token to the caller | lib/pushTokens.js, register-token |
| SEC-018 | P4 | Low | Forgot-password timing differs for valid teacher emails (mail send awaited only on match) | lib/teachers.js |

Earlier findings re-verified in the CURRENT tree (still open): API-001 (lib/iam.js:197-210 fallback), API-002 (app/api/schools/route.js:21 has no auth, and the public /setup page is outside the middleware matcher), API-003 (ledger, create-order, verify, attendance/student, subjects GET), API-004 (global roles; Principal holds permissions.manage), PRV-001 (students/[id] open to Parent and Accountant). Fixed since the prior audit: fee/student/[studentId]/summary now 401s, print-marksheet, timetable and marks GET now require a real actor, login page no longer shows credentials.

## Authentication analysis
- Login paths: superAdmin/schoolAdmin/teacher/parent server actions (app/actions/auth.js) and token routes /api/auth/{teacher,parent,staff}/login. All call checkLoginRateLimit, return a generic "Invalid email or password" and verify the password before revealing status (good: no status-based enumeration).
- Hashing: bcryptjs, 10 rounds (lib/auth/password.js). No policy beyond length 8 on self-service change (lib/teachers.js:603, lib/parentAccounts.js:176).
- JWT: jose HS256, 7 days, payload not re-derived from the DB; no jti, iss or aud; same token format is used as cookie and Bearer (lib/auth/jwt.js, session.js). No revocation (SEC-003).
- Cookie: httpOnly, Secure in production, SameSite=Lax, path /, 7-day maxAge (lib/auth/session.js:12-18). Good.
- Reset/invite: 256-bit random token, single use, 7-day TTL, stored unhashed (SEC-010). Link built from NEXT_PUBLIC_APP_URL, not the Host header (no host-header poisoning). Without SMTP_HOST the link is printed to logs (OBS-011).
- Temp passwords: Math.random, returned in API responses (API-010).
- Rate limiting: in-memory only (API-008, SEC-011).

## Authorization analysis
- Two parallel systems: requirePermission (session + DB role permissions; unauthenticated callers always get 401, positive) and the older getCurrentUserInfo role checks. The older one yields coarse role 'SchoolAdmin' for Admin, Principal and Accountant alike, and libs frequently use "role !== Teacher => allow" (SEC-001).
- Tenant derivation: schoolId is never read from a request body except POST /api/users (honoured only for SuperAdmin). Everything else uses resolveSchoolId(): session claim, else the global singleton (SEC-004).
- Parent portal: all /api/parent/* use requireParent and scope by actor.studentId from the signed session; switch-child verifies ParentStudentLink. Child ownership is sound there. Gaps are in the shared routes (SEC-001, SEC-006, PRV-001).
- Teacher scope: roster routes strip fields and filter by classTeacherOf in the query; performance libs call assertClassTeacherScope; marks/homework check assignments in lib (but only for role Teacher).
- Privilege escalation: PATCH /api/users/[id]/role is effectively SuperAdmin-only (rbacConstants.js:253-265), blocks self-change and cross-school; POST /api/users enforces the assign hierarchy. Weak points: SEC-005 and API-004 (global role permission editing by a Principal).

## Role-permission matrix (from prisma/rbacPermissions.js; X = granted)
| Area | SuperAdmin | Principal | Admin | Teacher | Accountant | Parent |
|---|---|---|---|---|---|---|
| students view | X | X | X | X (scoped) | X | X (see PRV-001) |
| students create/update/delete | X | X | X | - | - | - |
| teachers CRUD | X | X | X | - | - | - |
| attendance student view/mark | X | X | X | X (class teacher scope) | - | view only |
| attendance student update (lock) | X | X | X | - | - | - |
| leave apply / approve | X | X | approve+reject | apply | - | - |
| classes, subjects, timetable manage | X | X | X | timetable manage | - | - |
| exams manage / results publish | X | X | X | marks enter/update | - | results view |
| fees view/create/update/collect/refund | X | X | X | - | X | view, receipt |
| notices create/update/delete | X | X | X | X (own scope) | view | view |
| users view/create/update | X | X | X (no delete) | - | - | - |
| users delete | X | X | - | - | - | - |
| roles/permissions manage | X | X | - | - | - | - |
| settings update | X | X | X | - | - | - |
| performance reports | X | X | X | X (class teacher scope) | - | - |
Note: Teacher holds timetable.manage (restricted to Class Teacher sections in the route). Matrix is the SEEDED default; roles are global and editable (API-004).

## Middleware coverage
middleware.js matcher: /api/:path*, /dashboard, /super-admin, /parent, /, /login, /forgot-password. /api/* gets only CORS headers: no authentication at middleware level (each route must self-protect, which is where API-001/003 arise). /dashboard checks role tier only. Not matched: /setup (public school wizard that calls the unauthenticated POST /api/schools), /set-password (intended public). The file is the deprecated middleware convention (Next 16 renamed it proxy).

## Route inventory (180 route files; Auth gate = guard call found after stripping comments)
Counts: 2 routes with no auth call (static xlsx templates), 29 whose only gate is "actor/session non-null", all others use RBAC permission or role helpers. Tenant column: schoolId is derived server side via resolveSchoolId() for every route (singleton fallback described in SEC-004); the Notes column lists exceptions.

| Route | Methods | Auth gate | Tenant source | Notes |
|---|---|---|---|---|
| `admin-notifications/[id]` | PATCH | requireSchoolAdmin | session (resolveSchoolId) |  |
| `admin-notifications` | GET,PATCH | requireSchoolAdmin | session (resolveSchoolId) |  |
| `admin/profile-photo-upload-url` | POST | requireSchoolAdmin | lib-level (resolveSchoolId) |  |
| `admin/profile` | PATCH | requireSchoolAdmin | lib-level (resolveSchoolId) |  |
| `admins/[id]/permissions` | PATCH | requireSuperAdmin | lib-level (resolveSchoolId) |  |
| `admins/[id]/reset-password` | POST | requireSuperAdmin | lib-level (resolveSchoolId) |  |
| `admins/[id]` | GET | requireSuperAdmin | lib-level (resolveSchoolId) |  |
| `admins/[id]/status` | PATCH | requireSuperAdmin | lib-level (resolveSchoolId) |  |
| `admins` | GET | requireSuperAdmin | lib-level (resolveSchoolId) |  |
| `attendance/[id]/lock` | PATCH | RBAC perm: attendance.student.update | lib-level (resolveSchoolId) |  |
| `attendance/check-in` | GET,POST | requireTeacher | session (resolveSchoolId) |  |
| `attendance/my-summary` | GET | requireTeacher | session (resolveSchoolId) |  |
| `attendance/report` | GET | RBAC perm: attendance.student.report | lib-level (resolveSchoolId) |  |
| `attendance/roster` | GET | RBAC perm: attendance.student.view | lib-level (resolveSchoolId) | Parent holds attendance.student.view: reads any class roster+records (SEC-006) |
| `attendance` | POST | RBAC perm: attendance.student.mark | lib-level (resolveSchoolId) |  |
| `attendance/student/[id]` | GET | actor/session non-null only | lib-level (resolveSchoolId) | NO 401; ownership only if Parent (API-003) |
| `auth/parent/login` | POST | public login (rate-limited) | session (resolveSchoolId) | rate-limited (in-memory), JWT 7d returned in body |
| `auth/parent/switch` | POST | actor/session non-null only | lib-level (resolveSchoolId) | ownership verified via ParentStudentLink |
| `auth/staff/login` | POST | public login (rate-limited) | session (resolveSchoolId) | rate-limited (in-memory) |
| `auth/teacher/login` | POST | public login (rate-limited) | session (resolveSchoolId) | rate-limited (in-memory) |
| `calendar-events/[id]` | PUT,DELETE | requireSchoolAdmin | lib-level (resolveSchoolId) |  |
| `calendar-events` | GET,POST | requireSchoolAdmin | lib-level (resolveSchoolId) |  |
| `classes/[id]` | PUT,DELETE | RBAC perm: classes.manage | lib-level (resolveSchoolId) |  |
| `classes/[id]/sections/[sectionId]` | PUT | RBAC perm: classes.manage | lib-level (resolveSchoolId) |  |
| `classes/[id]/sections/[sectionId]/status` | PATCH | RBAC perm: classes.manage | lib-level (resolveSchoolId) | sectionId not verified to belong to classId (SEC-012) |
| `classes/[id]/sections/[sectionId]/teacher` | PATCH | RBAC perm: classes.manage | lib-level (resolveSchoolId) |  |
| `classes/[id]/sections` | POST | RBAC perm: classes.manage | lib-level (resolveSchoolId) |  |
| `classes/[id]/status` | PATCH | RBAC perm: classes.manage | lib-level (resolveSchoolId) |  |
| `classes/[id]/teacher` | PATCH | RBAC perm: classes.manage | lib-level (resolveSchoolId) |  |
| `classes/reorder` | PATCH | RBAC perm: classes.manage | lib-level (resolveSchoolId) |  |
| `classes` | POST | RBAC perm: classes.manage | lib-level (resolveSchoolId) |  |
| `classes/sections-map` | GET | actor/session non-null only | lib-level (resolveSchoolId) |  |
| `cron/cleanup-support-tickets` | GET | CRON_SECRET bearer | lib-level (resolveSchoolId) | CRON_SECRET bearer, fail-open if env unset |
| `cron/generate-fees` | GET | CRON_SECRET bearer | lib-level (resolveSchoolId) | CRON_SECRET bearer, fail-open if env unset (BIZ-001/OBS-004) |
| `exams/[id]/audit-log` | GET | RBAC perm: exams.manage | lib-level (resolveSchoolId) |  |
| `exams/[id]/duplicate` | POST | RBAC perm: exams.manage | lib-level (resolveSchoolId) |  |
| `exams/[id]/progress` | GET | RBAC perm: exams.manage | lib-level (resolveSchoolId) |  |
| `exams/[id]/results/effective` | GET | RBAC perm: results.publish | lib-level (resolveSchoolId) |  |
| `exams/[id]/results/publish` | POST,DELETE | RBAC perm: results.publish | lib-level (resolveSchoolId) |  |
| `exams/[id]/results` | GET,POST | RBAC perm: results.view / results.publish | lib-level (resolveSchoolId) |  |
| `exams/[id]` | GET,PUT,DELETE | RBAC perm: exams.manage | lib-level (resolveSchoolId) |  |
| `exams/[id]/schedules` | GET,POST | actor/session non-null only | lib-level (resolveSchoolId) | POST authorisation inside lib (admin or Class Teacher); GET role-filtered in lib |
| `exams/[id]/status` | PUT | actor/session non-null only | lib-level (resolveSchoolId) | authorisation inside lib (admin / Class Teacher) |
| `exams/[id]/verification` | GET | RBAC perm: exams.manage | lib-level (resolveSchoolId) |  |
| `exams/dashboard` | GET | RBAC perm: exams.manage | lib-level (resolveSchoolId) |  |
| `exams` | GET,POST | RBAC perm: exams.manage | lib-level (resolveSchoolId) |  |
| `exams/schedules/[scheduleId]/enrollments` | GET,PUT | RBAC perm: exams.manage | lib-level (resolveSchoolId) |  |
| `exams/schedules/[scheduleId]/marks` | GET,POST | actor/session non-null only | lib-level (resolveSchoolId) | any non-null actor incl. Parent can GET/POST (SEC-001) |
| `exams/schedules/[scheduleId]` | PUT,DELETE | actor/session non-null only | lib-level (resolveSchoolId) | authorisation inside lib (assertCanManageSchedule rejects Parent) |
| `exams/schedules/[scheduleId]/verify` | POST | RBAC perm: marks.update | lib-level (resolveSchoolId) |  |
| `fees/bulk-collect` | POST | RBAC perm: fees.collect | lib-level (resolveSchoolId) |  |
| `fees/collect` | POST | RBAC perm: fees.collect | lib-level (resolveSchoolId) |  |
| `fees/defaulters` | GET | RBAC perm: fees.view | lib-level (resolveSchoolId) | Parent holds fees.view: school-wide defaulter ids (SEC-006) |
| `fees/send-reminder` | POST | RBAC perm: notices.create | lib-level (resolveSchoolId) |  |
| `fees/structures/[id]/generate` | POST | RBAC perm: fees.create | lib-level (resolveSchoolId) |  |
| `fees/structures/[id]` | GET,PUT,DELETE | RBAC perm: fees.view / fees.update | lib-level (resolveSchoolId) |  |
| `fees/structures/bulk` | POST | RBAC perm: fees.create | lib-level (resolveSchoolId) |  |
| `fees/structures` | GET,POST | RBAC perm: fees.view / fees.create | lib-level (resolveSchoolId) |  |
| `fees/student/[studentId]` | GET | actor/session non-null only | lib-level (resolveSchoolId) |  |
| `fees/student/[studentId]/summary` | GET | actor/session non-null only | lib-level (resolveSchoolId) |  |
| `fees/students/[id]/discount` | POST,DELETE | RBAC perm: fees.update | lib-level (resolveSchoolId) |  |
| `fees/students/[id]/ledger` | GET | actor/session non-null only | lib-level (resolveSchoolId) | NO 401; only Parent-ownership if Parent (API-003); any role incl. session-less fallback; school = session/singleton |
| `fees/students/due-ids` | GET | RBAC perm: fees.view | lib-level (resolveSchoolId) |  |
| `fees/students/stats` | GET | RBAC perm: fees.view | lib-level (resolveSchoolId) |  |
| `fees/students/summary` | GET | RBAC perm: fees.view | lib-level (resolveSchoolId) |  |
| `homework/[id]` | PUT,DELETE | actor/session non-null only | lib-level (resolveSchoolId) | any non-null actor incl. Parent can PUT/DELETE (SEC-001) |
| `homework/page` | GET | actor/session non-null only | lib-level (resolveSchoolId) |  |
| `homework` | GET,POST | actor/session non-null only | lib-level (resolveSchoolId) | any non-null actor incl. Parent can POST (SEC-001) |
| `iam/me` | GET | actor/session non-null only | lib-level (resolveSchoolId) |  |
| `leaves/[id]` | PATCH | RBAC perm: permissionKey | session (resolveSchoolId) | permission checked after body parse (leave.approve/reject); tenant via resolveSchoolId |
| `leaves/balance` | GET | RBAC perm: leave.view | session (resolveSchoolId) |  |
| `leaves` | GET,POST | RBAC perm: leave.view / leave.apply | session (resolveSchoolId) |  |
| `notices/[id]` | GET,PUT,DELETE | RBAC perm: notices.update / notices.delete | lib-level (resolveSchoolId) |  |
| `notices/page` | GET | actor/session non-null only | lib-level (resolveSchoolId) |  |
| `notices/paged` | GET | actor/session non-null only | lib-level (resolveSchoolId) |  |
| `notices` | GET,POST | RBAC perm: notices.create | lib-level (resolveSchoolId) |  |
| `notices/upload-url` | POST | RBAC perm: notices.create | session (resolveSchoolId) |  |
| `notifications/register-token` | POST | actor/session non-null only | session (resolveSchoolId) | upsert by token transfers ownership (SEC-016) |
| `parent/calendar-events` | GET | requireParent | session (resolveSchoolId) |  |
| `parent/change-password` | POST | requireParent | session (resolveSchoolId) |  |
| `parent/exams/[id]/result` | GET | requireParent | lib-level (resolveSchoolId) |  |
| `parent/exams` | GET | requireParent | session (resolveSchoolId) |  |
| `parent/homework` | GET | requireParent | session (resolveSchoolId) |  |
| `parent/notices` | GET | requireParent | session (resolveSchoolId) |  |
| `parent/notifications/[id]/read` | POST | requireParent | session (resolveSchoolId) |  |
| `parent/notifications/read-all` | POST | requireParent | session (resolveSchoolId) |  |
| `parent/notifications` | GET | requireParent | session (resolveSchoolId) |  |
| `parent/profile-photo-upload-url` | POST | requireParent | lib-level (resolveSchoolId) |  |
| `parent/profile` | PATCH | requireParent | session (resolveSchoolId) |  |
| `payments/razorpay/create-order` | POST | actor/session non-null only | lib-level (resolveSchoolId) | NO 401; ownership only if Parent (API-003); live Razorpay order creation |
| `payments/razorpay/verify` | POST | actor/session non-null only | lib-level (resolveSchoolId) | NO 401; ownership only if Parent; HMAC verified (timingSafeEqual) (API-003) |
| `payments` | GET | RBAC perm: fees.view | lib-level (resolveSchoolId) |  |
| `performance/monthly/[studentId]/activities/[activityId]` | DELETE | RBAC perm: performanceReports.monthly.manage | lib-level (resolveSchoolId) |  |
| `performance/monthly/[studentId]/activities` | POST | RBAC perm: performanceReports.monthly.manage | lib-level (resolveSchoolId) |  |
| `performance/monthly/[studentId]/holistic` | PUT | RBAC perm: performanceReports.monthly.manage | lib-level (resolveSchoolId) |  |
| `performance/monthly/[studentId]/lock` | POST | RBAC perm: performanceReports.monthly.manage | lib-level (resolveSchoolId) |  |
| `performance/monthly/[studentId]/rating` | PUT | RBAC perm: performanceReports.monthly.manage | lib-level (resolveSchoolId) |  |
| `performance/monthly/[studentId]/remarks` | PUT | RBAC perm: performanceReports.monthly.manage | lib-level (resolveSchoolId) |  |
| `performance/monthly/[studentId]` | GET | RBAC perm: performanceReports.view | lib-level (resolveSchoolId) |  |
| `performance/monthly/[studentId]/unlock` | POST | RBAC perm: performanceReports.monthly.manage | lib-level (resolveSchoolId) |  |
| `performance/monthly/import/commit` | POST | RBAC perm: performanceReports.monthly.manage | lib-level (resolveSchoolId) |  |
| `performance/monthly/import/preview` | POST | RBAC perm: performanceReports.monthly.manage | lib-level (resolveSchoolId) |  |
| `performance/monthly/import/template` | GET | RBAC perm: performanceReports.monthly.manage | lib-level (resolveSchoolId) |  |
| `performance/monthly` | GET | RBAC perm: performanceReports.view | lib-level (resolveSchoolId) |  |
| `performance/tests/[id]/marks` | GET,POST | RBAC perm: performanceReports.view / performanceReports.tests.manage | lib-level (resolveSchoolId) |  |
| `performance/tests/[id]` | GET | RBAC perm: performanceReports.view | lib-level (resolveSchoolId) |  |
| `performance/tests` | GET,POST | RBAC perm: performanceReports.view / performanceReports.tests.manage | lib-level (resolveSchoolId) |  |
| `performance/yearly/[studentId]/lock` | POST | RBAC perm: performanceReports.yearly.manage | lib-level (resolveSchoolId) |  |
| `performance/yearly/[studentId]/rating` | PUT | RBAC perm: performanceReports.yearly.manage | lib-level (resolveSchoolId) |  |
| `performance/yearly/[studentId]/remark` | PUT | RBAC perm: performanceReports.yearly.manage | lib-level (resolveSchoolId) |  |
| `performance/yearly/[studentId]` | GET | RBAC perm: performanceReports.view | lib-level (resolveSchoolId) |  |
| `performance/yearly/[studentId]/unlock` | POST | RBAC perm: performanceReports.yearly.manage | lib-level (resolveSchoolId) |  |
| `performance/yearly` | GET | RBAC perm: performanceReports.view | lib-level (resolveSchoolId) |  |
| `permissions` | GET | RBAC perm: permissions.view | lib-level (resolveSchoolId) |  |
| `print-marksheet/classes` | GET | actor/session non-null only | lib-level (resolveSchoolId) | same |
| `print-marksheet` | GET | actor/session non-null only | lib-level (resolveSchoolId) | Parent/Accountant get school-wide class rosters (SEC-006) |
| `roles/[id]/permissions` | POST | RBAC perm: permissions.manage | lib-level (resolveSchoolId) | roles are global; Principal holds permissions.manage (API-004) |
| `roles/[id]` | PUT,DELETE | RBAC perm: roles.manage | lib-level (resolveSchoolId) | rename of any role incl. SuperAdmin role by roles.manage holder (API-004) |
| `roles` | GET,POST | RBAC perm: roles.view / roles.manage | lib-level (resolveSchoolId) |  |
| `school/attendance-settings` | PUT | RBAC perm: settings.update | lib-level (resolveSchoolId) |  |
| `school/branding` | PUT | RBAC perm: settings.update | lib-level (resolveSchoolId) |  |
| `school/contact` | PUT | RBAC perm: settings.update | lib-level (resolveSchoolId) |  |
| `school/logo-upload-url` | POST | RBAC perm: settings.update | session (resolveSchoolId) |  |
| `school/preferences` | PUT | RBAC perm: settings.update | lib-level (resolveSchoolId) |  |
| `school/profile` | PUT | RBAC perm: settings.update | lib-level (resolveSchoolId) |  |
| `schools/[id]/admin` | POST | requireSuperAdmin | lib-level (resolveSchoolId) |  |
| `schools/[id]/features` | PATCH | requireSuperAdmin | lib-level (resolveSchoolId) |  |
| `schools/[id]/manage` | POST | requireSuperAdmin | lib-level (resolveSchoolId) |  |
| `schools/[id]/razorpay` | PATCH | requireSuperAdmin | lib-level (resolveSchoolId) |  |
| `schools/[id]` | GET,PUT | requireSuperAdmin | lib-level (resolveSchoolId) |  |
| `schools/[id]/status` | PATCH | requireSuperAdmin | lib-level (resolveSchoolId) |  |
| `schools` | GET,POST | requireSuperAdmin | lib-level (resolveSchoolId) | POST has NO auth (API-002); GET super-admin only; reachable from public /setup |
| `sessions/[id]/activate` | PATCH | RBAC perm: settings.update | lib-level (resolveSchoolId) |  |
| `sessions/[id]/archive` | PATCH | RBAC perm: settings.update | lib-level (resolveSchoolId) |  |
| `sessions/[id]` | PUT | RBAC perm: settings.update | lib-level (resolveSchoolId) |  |
| `sessions` | POST | RBAC perm: settings.update | lib-level (resolveSchoolId) |  |
| `staff-attendance` | GET,POST | RBAC perm: attendance.teacher.view / attendance.teacher.mark | session (resolveSchoolId) |  |
| `students/[id]/discount/apply-pending` | POST | RBAC perm: students.update | lib-level (resolveSchoolId) |  |
| `students/[id]/discount` | POST,DELETE | RBAC perm: students.update | lib-level (resolveSchoolId) |  |
| `students/[id]/portal-access/reset-password` | POST | RBAC perm: students.update | session (resolveSchoolId) |  |
| `students/[id]/portal-access` | GET,POST,DELETE | RBAC perm: students.view / students.update | session (resolveSchoolId) |  |
| `students/[id]` | GET,PUT,DELETE | RBAC perm: students.view / students.update / students.delete | session (resolveSchoolId) | Parent/Accountant hold students.view: full record (PRV-001) |
| `students/bulk-import/blank-template` | GET | NONE | lib-level (resolveSchoolId) | static xlsx, benign |
| `students/bulk-import` | POST | RBAC perm: students.create | session (resolveSchoolId) |  |
| `students/bulk-import/template` | GET | NONE | lib-level (resolveSchoolId) | static xlsx, benign |
| `students/document-upload-url` | POST | RBAC perm: [students.create, students.update] | session (resolveSchoolId) |  |
| `students/paged` | GET | actor/session non-null only | session (resolveSchoolId) |  |
| `students/photo-upload-url` | POST | RBAC perm: [students.create, students.update] | session (resolveSchoolId) |  |
| `students/print-details` | GET | actor/session non-null only | session (resolveSchoolId) |  |
| `students/promote/conflicts` | POST | RBAC perm: students.update | session (resolveSchoolId) |  |
| `students/promote` | GET,POST | RBAC perm: students.update | session (resolveSchoolId) |  |
| `students` | GET,POST | RBAC perm: students.create | session (resolveSchoolId) |  |
| `subjects/[id]` | PATCH,DELETE | RBAC perm: subjects.manage | lib-level (resolveSchoolId) |  |
| `subjects` | GET,POST | RBAC perm: subjects.manage | lib-level (resolveSchoolId) | GET has no auth (API-003), POST needs subjects.manage |
| `support/tickets/[id]/replies` | POST | actor/session non-null only | session (resolveSchoolId) | unscoped write when actor.schoolId undefined (SEC-017) |
| `support/tickets/[id]` | GET | actor/session non-null only | session (resolveSchoolId) | unscoped when actor.schoolId undefined (SEC-017) |
| `support/tickets/[id]/status` | PATCH | requireSuperAdmin | lib-level (resolveSchoolId) |  |
| `support/tickets` | GET,POST | actor/session non-null only | session (resolveSchoolId) | GET/POST: schoolId=actor.schoolId (undefined for fallback actor => unscoped, SEC-017) |
| `support/unread-count` | GET | actor/session non-null only | session (resolveSchoolId) |  |
| `support/upload-url` | POST | actor/session non-null only | session (resolveSchoolId) |  |
| `teacher/calendar-events` | GET | requireTeacher | session (resolveSchoolId) |  |
| `teacher/change-password` | POST | requireTeacher | session (resolveSchoolId) |  |
| `teacher/notifications/[id]/read` | POST | requireTeacher | session (resolveSchoolId) |  |
| `teacher/notifications/read-all` | POST | requireTeacher | session (resolveSchoolId) |  |
| `teacher/notifications` | GET | requireTeacher | session (resolveSchoolId) |  |
| `teacher/profile-photo-upload-url` | POST | requireTeacher | lib-level (resolveSchoolId) |  |
| `teacher/profile` | PATCH | requireTeacher | session (resolveSchoolId) |  |
| `teachers/[id]/assignments` | POST,DELETE | RBAC perm: teachers.update | session (resolveSchoolId) |  |
| `teachers/[id]/reset-password` | POST | RBAC perm: teachers.update | session (resolveSchoolId) |  |
| `teachers/[id]` | PUT | RBAC perm: teachers.update | session (resolveSchoolId) |  |
| `teachers/[id]/status` | PATCH | RBAC perm: teachers.update | session (resolveSchoolId) |  |
| `teachers/document-upload-url` | POST | RBAC perm: [teachers.create, teachers.update] | session (resolveSchoolId) |  |
| `teachers/paged` | GET | RBAC perm: teachers.view | session (resolveSchoolId) |  |
| `teachers/photo-upload-url` | POST | RBAC perm: [teachers.create, teachers.update] | session (resolveSchoolId) |  |
| `teachers` | POST | RBAC perm: teachers.create | session (resolveSchoolId) |  |
| `timetable/list` | GET | RBAC perm: timetable.manage | lib-level (resolveSchoolId) |  |
| `timetable` | GET,PUT,DELETE | actor/session non-null only | lib-level (resolveSchoolId) |  |
| `users/[id]/role` | PATCH | RBAC perm: users.update | session (resolveSchoolId) | SuperAdmin-only effective (assertCanChangeRole); same-school check present |
| `users/[id]` | PUT | RBAC perm: users.update | session (resolveSchoolId) | no hierarchy check on target role/status (SEC-005) |
| `users` | GET,POST | RBAC perm: users.view / users.create | session (resolveSchoolId) | POST: schoolId from body honoured only for SuperAdmin; temp password Math.random (API-010) |

## Findings (highest severity first)
### SEC-001 - Any signed-in Parent (and Accountant) can write homework and exam marks: routes only require a non-null actor and libs treat every non-Teacher as admin
- **Severity:** P1   **Confidence:** High   **Status:** Confirmed   **Production blocker:** yes
- **Evidence:** lib/examMarks.js:32-33,164-169,243-247; lib/homework.js:201-203,231-232,269-281; app/api/homework/route.js:21-47; app/api/exams/schedules/[scheduleId]/marks/route.js:33-52; app/api/homework/[id]/route.js:5-28 (code-based, not executed)
- **Impact:** A parent token (mobile login) can POST/PUT/DELETE homework for any class (with push fan-out to students), read a full class marks sheet and upsert marks for any studentId. Academic-record integrity and spam of every parent in the school.
- **Recommendation:** Replace the "role !== Teacher => allow" shortcut with explicit allow-lists (SchoolAdmin/SuperAdmin) and add requirePermission (marks.enter/marks.update, homework manage) at the route; add a negative test per role.   (effort S; depends on API-001)

### SEC-017 - API-001 fallback actor also reaches write paths: support ticket replies/reads are unscoped when actor.schoolId is undefined; marks and homework run as the toggle Teacher
- **Severity:** P1   **Confidence:** High   **Status:** Confirmed   **Production blocker:** yes
- **Evidence:** lib/iam.js:197-210; lib/support.js:63-65,110-112,155-158 (undefined schoolId drops the where filter in Prisma); app/api/support/tickets/[id]/replies/route.js:5-19; app/api/support/tickets/[id]/route.js:13 (code-based; dev server not running so not re-tested live)
- **Impact:** Beyond the read leak in API-001: a session-less caller can read any ticket by id, list all tenants' tickets and post replies into any tenant's thread (triggering notifications), when a Teacher web login previously ran on that instance.
- **Recommendation:** Fix API-001 at the root; make support helpers throw on falsy schoolId.   (effort S; depends on API-001)

### SEC-004 - Process-global tenant and role singletons are mutated by every school-admin/teacher login, so SuperAdmin and session-less requests act on whichever school logged in last
- **Severity:** P1   **Confidence:** High   **Status:** Confirmed   **Production blocker:** yes
- **Evidence:** app/actions/auth.js:76-77,92,100-101,111,138; lib/school.js:29-31,43-45; lib/auth/schoolContext.js:23-27; app/api/schools/[id]/manage/route.js:21-24
- **Impact:** SuperAdmin sessions carry no schoolId, so resolveSchoolId() returns the global singleton: a SuperAdmin who stepped into school A can have reads and writes land in school B after a school-B admin logs in. Cross-tenant misdirected writes and disclosure.
- **Recommendation:** Remove active-school and dashboard-role singletons; carry the managed schoolId inside the SuperAdmin token or a per-request header validated server-side; resolveSchoolId must throw when no schoolId.   (effort L; depends on API-001, API-002, BIZ-001)

### SEC-002 - Dashboard server pages have no server-side role/permission guard: a signed-in Teacher can render Teachers, Fees, Settings and Promote pages with SSR data
- **Severity:** P1   **Confidence:** Medium   **Status:** Suspected   **Production blocker:** yes
- **Evidence:** app/dashboard/teachers/[id]/page.jsx:15-18; app/dashboard/teachers/page.jsx:14-18; app/dashboard/fees/payments/page.jsx:9; app/dashboard/fees/students/page.jsx:15-31; app/dashboard/layout.jsx:10-17; middleware.js:26-30,86-94 (middleware only checks role tier). Not executed.
- **Impact:** Hidden sidebar links are the only barrier: typing the URL returns data fetched directly from lib (bypassing API requirePermission), including teacher HR/financial fields (PRV-003) and school-wide fee payments.
- **Recommendation:** Add a shared page guard (requirePermission-equivalent for pages) to every dashboard page, or one in app/dashboard/layout per route segment; verify live per role.   (effort M; depends on PRV-003)

### SEC-003 - No session revocation: deactivated users, disabled teachers, deactivated admins and suspended schools keep access until the 7-day JWT expires
- **Severity:** P2   **Confidence:** High   **Status:** Confirmed   **Production blocker:** no
- **Evidence:** lib/auth/jwt.js:12-19; lib/rbac.js:96-118 (inactive User falls through to legacy role permissions); lib/iam.js:30-45 (admin.status returned, not enforced), 125-126; lib/teachers.js:228-234 (no loginEnabled/status check), 444-449 (checked at login only); no school.status check in any login path
- **Impact:** A fired admin/teacher or a suspended tenant retains full access for up to 7 days; a deactivated Principal is silently downgraded to Admin permissions rather than blocked; password reset does not invalidate stolen tokens.
- **Recommendation:** Re-check account and school status per request (cache briefly) or add a token version/jti stored per user; reject inactive users instead of falling back to the legacy role; shorten JWT lifetime.   (effort M)

### SEC-005 - PUT /api/users/[id] has no role-hierarchy check: an Admin can deactivate or re-email a Principal; status is not validated
- **Severity:** P2   **Confidence:** High   **Status:** Confirmed   **Production blocker:** no
- **Evidence:** app/api/users/[id]/route.js:75-103; prisma/rbacPermissions.js:131 (Admin holds users.update)
- **Impact:** A lower-ranked Admin can lock a Principal out (status) or alter identity fields of higher-ranked users in the same school; arbitrary status strings can be stored.
- **Recommendation:** Apply canAssignRole-style hierarchy to the target user, validate status against an enum, and block self-status change.   (effort S)

### SEC-006 - Parent role holds permissions that expose school-wide data: class attendance rosters, defaulter ids, all-class rosters
- **Severity:** P2   **Confidence:** High   **Status:** Confirmed   **Production blocker:** no
- **Evidence:** prisma/rbacPermissions.js:203-211; app/api/attendance/roster/route.js:10-34; app/api/fees/defaulters/route.js:9-12; lib/printMarksheet.js:24-30; app/api/classes/sections-map/route.js:12-20
- **Impact:** Any parent can read every class roster with attendance status for any date, the list of fee-defaulting student ids and every class-section roster. Extends PRV-001.
- **Recommendation:** Add Parent blocks or ownership scoping to these routes; remove attendance.student.view from the Parent default set if unused.   (effort S; depends on PRV-001)

### SEC-010 - Set-password link: no server-side password policy, 7-day plaintext token, no redemption throttling, no status re-check; reset only exists for teachers
- **Severity:** P3   **Confidence:** High   **Status:** Confirmed   **Production blocker:** no
- **Evidence:** lib/teachers.js:7,458-470,507-524 (no length check at redemption, status not re-checked); prisma/schema.prisma:131-132,666-667 (passwordSetToken stored unhashed)
- **Impact:** A DB or log leak exposes usable reset tokens for a week; weak passwords can be set through the link; parents and admins have no self-service reset.
- **Recommendation:** Store a hash of the token, shorten TTL to 1-2 hours, enforce min length and common-password checks server-side, rate-limit redemption.   (effort S; depends on API-010)

### SEC-011 - Login rate limiter is bypassable and enables targeted lockout: client-controlled x-forwarded-for first hop, per-instance memory, 8-attempt per-account counter
- **Severity:** P3   **Confidence:** High   **Status:** Confirmed   **Production blocker:** no
- **Evidence:** lib/auth/loginRateLimit.js:19-21,51-55,61-71; no limit on lib/parentAccounts.js change-password current-password guesses
- **Impact:** Attackers rotate XFF to defeat the IP bucket and cold starts reset counters; anyone can lock a victim account out for 15 minutes per instance.
- **Recommendation:** Shared store (Upstash/Postgres), use platform-provided client IP, add progressive delay rather than hard lockout.   (effort M; depends on API-008, OBS-013)

### SEC-012 - Cross-tenant reference gaps: section update not tied to class, classTeacherId and marks studentId not validated against the school
- **Severity:** P3   **Confidence:** Medium   **Status:** Confirmed   **Production blocker:** no
- **Evidence:** lib/classes.js:444-449 (section updated by id after checking only the class), 401-420,491-520 (classTeacherId unvalidated); lib/examMarks.js:243-247 (rows[].studentId unvalidated)
- **Impact:** With a foreign cuid a caller can mutate another tenant's section status or link foreign teachers/students into own records; needs a guessed id so likelihood is low.
- **Recommendation:** Scope every update by schoolId in the where clause (updateMany with schoolId) and validate referenced ids belong to the school.   (effort S)

### SEC-013 - Login lookups by email are global while uniqueness is per school or absent, so same-email accounts collide
- **Severity:** P3   **Confidence:** Medium   **Status:** Confirmed   **Production blocker:** no
- **Evidence:** lib/teachers.js:437-440 (Teacher.loginEmail not unique); lib/parentAccounts.js:108-111 with prisma/schema.prisma:285 (@@unique schoolId+email); lib/rbac.js:45-48
- **Impact:** A parent or staff member with the same email in two schools may be unable to sign in or land in the wrong tenant.
- **Recommendation:** Make login emails globally unique or require a school code at login.   (effort M)

### SEC-016 - Push token registration transfers ownership of an existing token to the caller
- **Severity:** P3   **Confidence:** Medium   **Status:** Confirmed   **Production blocker:** no
- **Evidence:** lib/pushTokens.js:8-13 (upsert by token updates owner); app/api/notifications/register-token/route.js:12-36
- **Impact:** A caller who learns another device token can redirect that device's notifications to their own identity; also tokens are not removed on logout (MOB-004).
- **Recommendation:** Refuse re-binding of a token owned by another user unless proven by device; delete token on logout.   (effort S; depends on MOB-004)

### SEC-018 - Forgot-password timing differs for valid teacher emails (mail send awaited only on match)
- **Severity:** P4   **Confidence:** Low   **Status:** Suspected   **Production blocker:** no
- **Evidence:** lib/teachers.js:458-470; app/actions/auth.js:184-200
- **Impact:** Account enumeration by response time, mitigated by rate limit.
- **Recommendation:** Send the mail without awaiting, or pad response time.   (effort S)


## Positive observations
- Every requirePermission route is unreachable without a valid session (getCurrentRBACUser is session-only).
- schoolId is never taken from request bodies for tenant selection (single exception is SuperAdmin-only).
- Parent child-ownership derived from the signed session; switch-child verifies the link.
- Razorpay verification uses HMAC with timingSafeEqual and per-school AES-256-GCM encrypted secrets; amounts are computed server side.
- Login responses are generic and the password is verified before account status is disclosed.
- Role change endpoint blocks self-change, cross-school and non-SuperAdmin callers.
- Print/report HTML is escaped; the only raw SQL uses tagged-template parameters (one executeRawUnsafe with a literal column name).

## Limitations / not assessed
- Live endpoint verification - the local dev server was not running (curl returned no response); all auth results are code-based
- Production hosting configuration (Vercel headers, env values, CRON_SECRET presence, bucket public/ACL settings) - not accessible
- Mobile client security (schoolapp360) - covered by 08-mobile-application-audit.md
- Every lib function and every one of 283 components - sampled; tenant filters verified by grep on update/delete/findUnique-by-id patterns plus targeted reads
- JWT_SECRET / ENCRYPTION_KEY entropy and rotation - env values must not be read
- R2 bucket policy and CORS, Pusher channel auth, Expo push abuse limits - external configuration
