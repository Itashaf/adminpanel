# 05 - Database and Data Integrity Audit (auditor a5)

## Scope
`prisma/schema.prisma` (1,775 lines, 52 models, read in full), `prisma/migrations`, `prisma/seed.js` (read only), the `lib/*.js` write paths that enforce (or fail to enforce) integrity, and read-only catalog/orphan queries against the LOCAL PostgreSQL (host confirmed `localhost:5432` by the script before connecting; credentials never printed; no EXPLAIN ANALYZE, only plain `EXPLAIN` on three queries).

## Method
1. Read the whole schema; classified every relation by `onDelete`, every tenant-owned model by `schoolId`, every unique/index.
2. Throwaway Node script outside the repo (scratchpad) ran only `SELECT`/catalog queries: `pg_stat_user_tables`, `pg_indexes`, `pg_constraint`, `_prisma_migrations`, and orphan/consistency SELECTs.
3. Traced write paths in `lib/students.js`, `lib/classes.js`, `lib/fees.js`, `lib/teachers.js`, `lib/parentAccounts.js`, `lib/rbac.js`, `lib/attendance.js`.

Verified vs only read: DB facts below marked "(local DB)" were queried. Everything else is code-based, not executed. The local DB is a small demo dataset (3 schools, 190 students, 163 attendance rows), so row counts and EXPLAIN plans say nothing about scale; the planner chooses seq scans on tiny tables regardless of indexes.

## Summary table

| ID | Sev | Conf | Title | Component |
|---|---|---|---|---|
| DB-001 | P1 | High | Migration history does not represent the schema (1 init migration, 2 of 52 models) | Migrations / DevOps |
| DB-002 | P1 | High | Manual fee collection is a read-modify-write outside the transaction: double-collect / overpay race | Fees / Payment |
| DB-003 | P1 | High | Login identity is looked up by email only, but uniqueness is per school (or absent): ambiguous account resolution | Auth identity tables |
| DB-004 | P2 | High | Missing indexes: no `schoolId`-leading index on Payment, StudentFee, Notice, CalendarEvent; unindexed FK columns | Indexes |
| DB-005 | P2 | High | Hard delete of a Student cascades away exam results, marks, enrollment history and the "append-only" promotion log | Deletion / archival |
| DB-006 | P2 | High | All business dates are `String`; school `timezone` setting is never used to compute "today" | Date design |
| DB-007 | P2 | High | Attendance / assignments / timetable stored as JSON arrays of ids with no FK, no per-student uniqueness, last-writer-wins saves | Attendance, Teacher.assignments |
| DB-008 | P2 | Medium | Seed script is stale against the schema and embeds plaintext demo credentials and fixed `school-1` ids | prisma/seed.js |
| DB-009 | P3 | High | Status/type fields mix real enums with free strings | Schema |
| DB-010 | P3 | High | Money design: whole-rupee Int, derived payable amount, no DB invariants, hard-coded INR/paise | Fees |
| DB-011 | P3 | High | DB-level invariants documented as "enforced in code" are not enforced (one active session, one class-teacher per session) | Sessions / Sections |
| DB-012 | P3 | High | Child tables without `schoolId` (ReportLock cannot be tenant-scoped at all) | Tenant ownership |
| DB-013 | P4 | High | Dead / stale schema elements | Schema hygiene |

## Findings

### DB-001 - Migration history does not represent the schema
- **Category:** Database / DevOps
- **Severity:** P1   **Confidence:** High   **Status:** Confirmed
- **Affected component:** `prisma/migrations`, deployment
- **Evidence:** `prisma/migrations/20260830172048_init/migration.sql:1-38` creates only the `AdminStatus` enum and the `SuperAdmin` and `SchoolAdmin` tables; `prisma/schema.prisma` defines 52 models. `git log -- prisma/migrations` shows only the initial commit. `_prisma_migrations` in the local DB has exactly one row. `package.json:7` build script is `prisma generate && next build` (no `prisma migrate deploy`). The schema header comments and the existence of RBAC/support/enrollment tables in the local DB prove the schema was applied some other way (`db push` style).
- **Impact:** A new environment (staging, DR restore target, a second region) cannot be created from the repo; `prisma migrate deploy` would produce a database missing 50 tables. No reviewable, reversible record of schema change; no safe path for additive changes with data (e.g. converting date strings to DateTime). Production schema drift cannot be detected.
- **Reproduction / verification:** code-based plus local catalog query of `_prisma_migrations`; not executed against any other DB.
- **Root cause:** Schema evolved with `db push`; migrations were never re-baselined.
- **Recommended fix:** Baseline: generate a full-schema migration from the production-equivalent schema (`prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`), mark it applied on existing databases with `prisma migrate resolve --applied`, and from then on use `migrate dev`/`migrate deploy` in the release process.
- **Validation:** Create an empty scratch database, run `migrate deploy`, then `migrate diff` against the real schema returns empty.
- **Effort:** M   **Dependencies:** DB-004, DB-006 (both need migrations)

### DB-002 - Manual fee collection race: stale read outside the transaction
- **Category:** Database / Backend
- **Severity:** P1   **Confidence:** High   **Status:** Confirmed (code-based; race not executed)
- **Affected component:** Fees > collect payment, Razorpay verify
- **Evidence:** `lib/fees.js:1025-1058` (`collectManualPayment`): reads the fee with `getStudentFeeById`, checks `status === 'PAID'` and `remainingDue` in JS, computes `newPaidAmount = fee.paidAmount + collectAmount`, then runs `$transaction([payment.create, studentFee.update({ paidAmount: newPaidAmount })])`. The transaction does not re-read or lock the fee, and `paidAmount` is written as an absolute value. `lib/fees.js:1194-1250` (`verifyRazorpayPayment`) has the same shape (`fee.paidAmount + payment.amount`). There is no unique key or CHECK constraint tying `sum(Payment.amount where SUCCESS)` to `StudentFee.paidAmount` or capping it at the payable amount (schema `StudentFee`, `Payment`, lines 537-557 and 1427-1443).
- **Impact:** Two accountants (or a double click, or a manual collect racing a pending Razorpay verify for the same fee) both pass the "not PAID" check; two SUCCESS Payment rows are created while `paidAmount` reflects only one (or a Razorpay verify adds on top of a manual full payment). Ledger and fee row then disagree; the school's reconciliation breaks and parents can be double-charged. Local DB: fee rows are currently consistent (0 overpaid), so this is a latent defect, not observed corruption.
- **Reproduction / verification:** code-based. Safe test: in a scratch DB, fire two concurrent `collectManualPayment` calls for the same `studentFeeId`.
- **Root cause:** Check-then-act with application-computed absolute totals and no row lock/optimistic condition.
- **Recommended fix:** Inside one interactive transaction do the guarded update: `updateMany({ where: { id, schoolId, paidAmount: fee.paidAmount }, data: { paidAmount: { increment: amount }, status } })` and abort if `count === 0`; or `SELECT ... FOR UPDATE` via `$queryRaw`. For Razorpay mark the pending Payment SUCCESS with `updateMany({ where: { id, status: 'PENDING' } })` first and only continue if it matched.
- **Validation:** Concurrency test (two parallel calls) yields exactly one SUCCESS Payment and `paidAmount` equals the sum of SUCCESS payments.
- **Effort:** S-M   **Dependencies:** REL-001

### DB-003 - Login identity resolved by email only; uniqueness is per school or absent
- **Category:** Database / Security
- **Severity:** P1   **Confidence:** High   **Status:** Confirmed
- **Affected component:** Teacher / Parent / Principal-Accountant / SchoolAdmin sign-in
- **Evidence:** Schema: `Teacher` has no unique on `loginEmail` or `email` (only `@@unique([schoolId, employeeId])`, `schema.prisma:678`); `ParentAccount` is `@@unique([schoolId, email])` (285); `User` is `@@unique([schoolId, email])` (153); `SchoolAdmin.email` is globally unique (322-326). Lookups: `lib/teachers.js:436-440` and `:460-463` `findFirst({ where: { loginEmail: ... } })` with no school; `lib/parentAccounts.js:108-111` `findFirst` by email only; `lib/rbac.js:44-49` `user.findFirst` by email for Principal/Accountant. Local DB: one group of 4 teachers in one school shares the same `loginEmail` (demo data), 13 of 26 teachers have login enabled.
- **Impact:** Two schools can legitimately register the same parent or teacher email (the schema permits it), after which `findFirst` returns an arbitrary row: the person logs into the wrong tenant, or a correct password for school B fails because school A's row was returned first (a person who is a parent at two schools cannot sign in to one). Within a school, duplicate teacher login emails make password-reset and login nondeterministic. This is both an integrity and a tenant-isolation risk (credential of one tenant matched against another tenant's account when passwords coincide).
- **Reproduction / verification:** code-based; local duplicate group confirmed by `GROUP BY lower("loginEmail") HAVING count(*) > 1`.
- **Root cause:** Tenant-scoped uniqueness in the schema, global lookup in the login flows; no uniqueness at all for Teacher emails.
- **Recommended fix:** Decide the product rule. Simplest consistent option: login emails are globally unique across tenants (unique index on lowercased email per identity table, or a single `User` identity table), with a data-cleanup migration first. Alternative: require a school code at login and look up `{ schoolId, email }`. Add `@@unique([schoolId, loginEmail])` to Teacher at minimum.
- **Validation:** Unique violations on duplicate create; login test with the same email in two schools.
- **Effort:** M   **Dependencies:** REL-003, DB-001

### DB-004 - Index gaps against the hot tenant-scoped query patterns
- **Category:** Database / Performance
- **Severity:** P2   **Confidence:** High   **Status:** Confirmed (index set); impact at scale not measured
- **Affected component:** Payments, student fees, notices, calendar, FK lookups
- **Evidence:** `pg_indexes` (local DB) and schema. Query patterns from `lib/*.js` vs index:
  - Students list/roster by `(schoolId, academicSession, class, section, status)`: `Students_schoolId_academicSession_class_section_status_idx` present. Good. Searches (`contains`, insensitive, on names/admissionId, `guardian` JSON path, `lib/students.js:268-286`) cannot use it beyond `schoolId`.
  - Attendance by date/class: unique `(schoolId, academicSession, date, className, sectionName)` serves day and date-range lookups. Good. Dashboard trend `WHERE schoolId` scans all rows of the school (see PERF-003).
  - Payments by school/status/date (`lib/fees.js:704-720`, `1408-1416`, `1537`, `1551`, `lib/dashboard.js:342`): the only indexes on `Payment` are the two `razorpay*` uniques. No `(schoolId, status, paidAt)` / `(schoolId, createdAt)` index; `Payment.studentId` and `Payment.studentFeeId` (FKs, used by ledger and fee detail) are unindexed.
  - StudentFee by school (`loadSchoolFees`, `lib/fees.js:1340`; groupBy at `:1413`): only `(studentId, academicSession, term)` unique exists; no `schoolId`-leading index. Local `EXPLAIN` of the payments query uses a Seq Scan (tiny table, not conclusive).
  - Notices (`lib/notices.js:58`), CalendarEvents (`lib/calendarEvents.js:40`), Subjects/Classes lists: filtered on `schoolId` with `orderBy createdAt/startDate`; Notice and CalendarEvent have no index at all.
  - Per-student lookups with no student-leading index: `ParentStudentLink(studentId)` (used by notification fan-out and fees, `lib/notices.js:477`, `lib/fees.js:996`; only `(parentAccountId, studentId)` unique exists), `ExamMark(studentId)`, `ExamResult(studentId)` (`lib/examResults.js:245`), `StudentEnrollments(classId)`, `(sectionId)`, `Sections(classTeacherId)`, `TeacherLeave(teacherId)`, `SubjectTests(teacherId, subjectId)`.
  - Postgres does not index FK columns automatically, so the cascades in DB-005 (delete Student) and Class/Section/Teacher deletes also seq-scan the child tables.
- **Impact:** Fine at demo size. At the stated target (hundreds of thousands of payments, millions of ExamMarks, ParentNotifications growing with every notice x student) these become sequential scans shared across all tenants, plus slow deletes. Not a proven bottleneck; marked P2 because the fix is cheap and the table with highest write volume (Payment, ParentNotifications) lacks school-leading access paths.
- **Reproduction / verification:** index listing from `pg_indexes`; plans on a 17-row table are not evidence. Validate with `EXPLAIN (ANALYZE)` on a seeded 100k-student copy (not on this DB).
- **Root cause:** Indexes were added reactively for roster/exam tables; fees/payments/notices modules were not revisited.
- **Recommended fix:** `@@index([schoolId, status, paidAt])` and `@@index([studentId])`, `@@index([studentFeeId])` on Payment; `@@index([schoolId, academicSession])` on StudentFee; `@@index([schoolId, createdAt])` on Notice; `@@index([schoolId, startDate])` on CalendarEvent; `@@index([studentId])` on ParentStudentLink, ExamMark, ExamResult; `@@index([classId])`/`[sectionId]` on StudentEnrollment. Consider `pg_trgm` GIN indexes if student search becomes slow.
- **Validation:** Plans on a scaled dataset show Index Scan; write-throughput regression check on Payment inserts.
- **Effort:** S   **Dependencies:** DB-001 (ship as migration)

### DB-005 - Student hard delete destroys academic history and the audit trail
- **Category:** Database
- **Severity:** P2   **Confidence:** High   **Status:** Confirmed (code-based)
- **Affected component:** Students > delete
- **Evidence:** `lib/students.js:673-698` `deleteStudent` runs `prisma.student.delete`; it only fails (P2003) if StudentFee/Payment/MonthlyReport/YearlyReport/SubjectTestMark rows exist (Restrict). `pg_constraint` (local DB) and schema show Cascade from Student to `ExamMark`, `ExamResult`, `ExamOptionalEnrollment`, `StudentEnrollment`, `StudentPromotionLog`, `ParentNotification`, `ParentStudentLink`. `schema.prisma:1036-1040` documents `StudentPromotionLog` as "append-only ... never updated/deleted". The student's id also stays inside `Attendance.records` JSON.
- **Impact:** A student who has exam marks and results but no fee row (e.g. fees not generated, or a school not using the fee module) can be hard-deleted, silently deleting published results, enrollment history and the promotion log (data a school is typically required to retain). Which students are deletable depends on an unrelated module's data. No soft-delete column exists; `status` TransferredOut/Graduated is the workaround and is advisory only. All 20+ `School` relations are Restrict, so a school cannot be offboarded/purged by a single delete and there is no documented tenant export/purge procedure.
- **Reproduction / verification:** code-based; not executed.
- **Root cause:** Delete policy was derived from "what happens to block it" rather than a retention rule.
- **Recommended fix:** Make delete = status change (or an `archivedAt DateTime?` column) for any student with enrollments/results; restrict hard delete to students with no academic or financial history; change `StudentPromotionLog.student` and `ExamResult.student` to Restrict.
- **Validation:** Attempt delete on a student with marks only: refused.
- **Effort:** M   **Dependencies:** REL-002

### DB-006 - Business dates stored as `String`; school timezone is not used
- **Category:** Database
- **Severity:** P2   **Confidence:** High (storage) / Medium (UTC server-clock effect, Vercel TZ not inspected)   **Status:** Confirmed
- **Affected component:** Admission, attendance, exams, fee term dates, leave, calendar, notices, homework
- **Evidence:** `String` date columns: `Student.admissionDate`, `dob`; `Teacher.dob`, `joiningDate`, `relievingDate`; `Attendance.date`; `TeacherAttendance.date`; `Exam.startDate/endDate`; `ExamSchedule.examDate`; `FeeStructureTerm.startDate`; `AcademicSession.startDate/endDate`; `CalendarEvent.startDate/endDate`; `Notice.expiryDate`; `Homework.assignedDate`; `TeacherLeave.startDate/endDate`; `MonthlyReport.month`. Month filters use string prefixes (`lib/dashboard.js:101,109` `startsWith`), ranges rely on lexicographic order (`lib/attendance.js:174` `gte/lte` on strings). Local DB: all 163 attendance dates and 190 admission dates are well-formed 10-char values (no malformed data observed today). `lib/dateUtils.js:1-25` computes "today" from the server's local clock (`getFullYear/getMonth/getDate`), `lib/exams.js:128`, `lib/examMarks.js:413` use `toISOString().slice(0,10)` (UTC). `School.timezone` is saved (`lib/schoolSettings.js:151`) but grep finds no use of it in any date computation.
- **Impact:** No DB-level validation (any string can be stored); correctness depends on every writer emitting `YYYY-MM-DD`. On Vercel the server clock is normally UTC, so for an Asia/Kolkata school between 00:00 and 05:30 local time "today" is the previous day: attendance "mark today", the 14:00 deadline (`School.attendanceDeadlineTime`, applied with server-local `setHours`), exam "upcoming/ongoing" and fee-term generation can act on the wrong day. Date arithmetic and reporting in SQL require casts.
- **Reproduction / verification:** code-based. Check Vercel function `TZ` and compare behaviour at 23:00 UTC.
- **Root cause:** Dates modelled as display strings; per-school timezone captured but not applied.
- **Recommended fix:** Smallest effective step: one `schoolToday(timezone)` helper (using `Intl.DateTimeFormat('en-CA', { timeZone })`) used by every "today" computation. Longer term, migrate date columns to `@db.Date` with a CHECK or a backfill migration (needs DB-001 first).
- **Validation:** Unit check of helper at 20:00 UTC for Asia/Kolkata returns the next calendar day.
- **Effort:** S (helper) / L (column migration)   **Dependencies:** DB-001

### DB-007 - Relationships held in JSON arrays: no FK, no uniqueness, whole-array overwrite
- **Category:** Database
- **Severity:** P2   **Confidence:** High   **Status:** Confirmed
- **Affected component:** Attendance, TeacherAttendance, Teacher.assignments, TimeTable.schedule, Student JSON blobs
- **Evidence:** `Attendance.records` (`schema.prisma:874`), `TeacherAttendance.records` (723), `Teacher.assignments` (661), `TimeTable.schedule` (812), `Student.guardian/feeDetails/documents` (387-400), `CalendarEvent.appliesToClasses/Sections`, `GeneratedReportJob.targetIds String[]`. `lib/attendance.js:57-69` `saveAttendance` upserts the whole `records` array supplied by the client. Local DB orphan checks (all 0): attendance record ids not in Students; teacher assignments referencing a non-existent Class; notices pointing at missing teachers. 163 attendance rows hold 1,700 student marks (about 10 per row) in the demo data.
- **Impact:** (a) Student/teacher ids inside JSON are never checked by the DB: deleting or transferring a student leaves dangling ids and a student can appear twice in one `records` array. (b) Concurrency: two users saving the same class+date (teacher plus admin override) overwrite each other (last writer wins, no version/`updatedAt` precondition). (c) Per-student attendance queries cannot use an index; every report scans and `find()`s inside arrays (PERF-009). (d) The design is a conscious trade-off (documented at `schema.prisma:852-862`), reasonable for write amplification, but it makes attendance the one core record without referential integrity. `Student.feeDetails` JSON duplicates fee concepts that also live in StudentFee (see REL-005).
- **Reproduction / verification:** code-based plus local orphan SELECTs.
- **Root cause:** Denormalisation chosen for write cost and speed of development.
- **Recommended fix:** Keep the row-per-section shape but (1) add an `updatedAt`/version precondition to `saveAttendance`, (2) validate that every `studentId` belongs to the section's enrolled roster before saving (one query), (3) when a student is removed, either block or purge ids from records. A row-per-student `AttendanceEntry(attendanceId, studentId, status)` table is the proper fix if per-student reporting becomes a hot path; benchmark first.
- **Validation:** Duplicate/foreign student id in `records` rejected; concurrent save returns a conflict.
- **Effort:** M   **Dependencies:** PERF-003, PERF-009

### DB-008 - Seed script out of date with the schema; demo credentials and fixed ids
- **Category:** Database / DevOps
- **Severity:** P2   **Confidence:** Medium   **Status:** Confirmed (code-based; script not run per rules)
- **Affected component:** `prisma/seed.js`, `package.json` `db:seed`
- **Evidence:** `prisma/seed.js:148-152` updates `Student.portalPasswordHash`, a field that no longer exists in the schema (parent logins moved to `ParentAccount`, `schema.prisma:401-403`); `prisma/seed.js:112-113` seeds two school-admin accounts with a shared plaintext demo password literal; `:148` a parent demo password literal; `:3-8,84-92` the SuperAdmin password comes from an env var or is generated and printed to stdout. Fixed ids `school-1`/`school-2` mirror `lib/school.js:5` `SEED_SCHOOL_ID`, which production code still uses as a fallback tenant (see PERF-001).
- **Impact:** `npm run db:seed` will fail against the current schema (Prisma rejects an unknown field) so the documented bootstrap path for a new environment is broken. If it is patched and run in production, known demo credentials for admin and parent accounts would be created. Type only reported here; values are not repeated.
- **Reproduction / verification:** code-based; not executed.
- **Root cause:** Seed not maintained when the parent-account model replaced per-student portal passwords.
- **Recommended fix:** Split into `seed-reference.js` (roles, permissions, grade scale: safe for prod) and `seed-demo.js` (guarded by `NODE_ENV !== 'production'`); remove stale fields; generate random demo passwords.
- **Validation:** Fresh DB: `migrate deploy` then reference seed succeeds; demo seed refuses to run in production.
- **Effort:** S   **Dependencies:** DB-001

### DB-009 - Status/type columns: enums mixed with free strings
- **Category:** Database
- **Severity:** P3   **Confidence:** High   **Status:** Confirmed
- **Evidence:** Enums exist for StudentStatus, FeeTerm, PaymentStatus, ExamStatus, ExamMarkStatus, etc. Free `String` for: `AcademicSession.status` (`schema.prisma:986`, "Active/Upcoming/..."), `ExamResult.status` (1266), `ExamMark.attendanceStatus` (1226), `Notice.audience/priority/recipientType` (925-938), `CalendarEvent.category`, `PushToken.ownerRole/platform`, `StudentPromotionLog.action`, `ExamAuditLog.action`, `Exam.examType` (intentionally open), `Attendance` record `status` inside JSON, `ReportLock.userId`.
- **Impact:** A typo in code writes a status no query matches; no DB protection. Low today because values come from shared constant arrays; risk grows with more writers (mobile, API).
- **Recommended fix:** Convert the closed sets (AcademicSession.status, ExamResult.status, Notice.audience) to enums when next touching them; add CHECK constraints where enums are unwanted.
- **Validation:** Insert of an unknown value fails.
- **Effort:** S-M   **Dependencies:** DB-001

### DB-010 - Money columns: Int rupees, derived payable amount, no invariants
- **Category:** Database
- **Severity:** P3   **Confidence:** High   **Status:** Confirmed
- **Evidence:** All amounts are `Int` (`StudentFee.totalAmount/paidAmount`, `Payment.amount`, discounts, late fees); no Float/Decimal for money. `lib/fees.js:100-104` rounds percent discounts with `Math.round`; late fees accrue per day at read time (`discountAmountFor`, `lateFeeAmountFor`, `daysOverdueFor`), so `payableAmount` is never stored and changes as time passes. `lib/fees.js:1157,1166` hard-code `* 100` paise and `currency: 'INR'` while `School.currency` exists. No CHECK that `paidAmount <= payable` or `amount > 0`; no receipt number or refund/reversal row type (`PaymentStatus` has no REFUNDED); abandoned Razorpay orders stay PENDING forever (local DB: 9 PENDING vs 4 SUCCESS Razorpay payments).
- **Impact:** Whole rupees are acceptable for Indian school fees but cannot represent paise-level concessions; the stored `status` (PAID) can become inconsistent with a later-changing computed payable amount; no audit-grade receipt sequence per school. Not a correctness bug today.
- **Recommended fix:** Add CHECK constraints (`paidAmount >= 0`, `amount > 0`); add a per-school receipt number on SUCCESS payments; freeze late fee into the StudentFee (or record it as a StudentFeeItem) when applied; add a PENDING-order expiry job. Keep Int but document the unit as rupees.
- **Validation:** Constraint violations rejected; reconciliation query `sum(Payment) = paidAmount` returns zero mismatches.
- **Effort:** M   **Dependencies:** DB-002, REL-001

### DB-011 - Invariants documented as "enforced in code" are not enforced
- **Category:** Database
- **Severity:** P3   **Confidence:** High   **Status:** Confirmed
- **Evidence:** `schema.prisma:826-829` (one class teacher per section per session), `:976-977` (exactly one Active AcademicSession per school), `User` nullable `schoolId` unique (`:147-153`, acknowledged). Local DB checks: 0 violations of either invariant today.
- **Impact:** Concurrent requests or direct DB edits can violate them. Postgres partial unique indexes handle both: `CREATE UNIQUE INDEX ... ON "AcademicSessions"("schoolId") WHERE status = 'Active'`; `ON "Sections"("classTeacherId","academicSession") WHERE "classTeacherId" IS NOT NULL`; `ON "User"(lower(email)) WHERE "schoolId" IS NULL`. Prisma cannot declare them but they can live in a migration (needs DB-001).
- **Effort:** S   **Dependencies:** DB-001

### DB-012 - Tenant ownership gaps
- **Category:** Database
- **Severity:** P3   **Confidence:** High   **Status:** Confirmed
- **Evidence:** Models without a `schoolId` column: `StudentFeeItem`, `FeeStructureTerm`, `FeeStructureItem`, `SubjectTestMark`, `MonthlyReportActivity/Holistic/Remark`, `SupportTicketReply` (all reachable only through a tenant-owned parent, acceptable), plus `ReportLock` (`schema.prisma:1648-1658`: polymorphic `reportId`, `userId` with no FK and no `schoolId`, so a tenant filter on it is impossible) and `SubjectTestMark.studentId` which is not tied to the test's school by any constraint. Global-by-design: `Role`, `Permission`, `RolePermission`, `SuperAdmin`. Per-school-scoped uniqueness exists for Student.admissionId, Teacher.employeeId, Class, Section (via class), Subject, Session, ParentAccount, User (nullable). `ParentStudentLink.schoolId` is denormalised but nothing enforces that it equals both sides' school (comment at `schema.prisma:288-294` admits it is app-checked).
- **Impact:** Cross-tenant joins are blocked only by application code. ReportLock rows cannot be listed or purged per tenant.
- **Recommended fix:** Add `schoolId` + index to `ReportLock`; for the ParentStudentLink invariant use composite FKs `(schoolId, studentId)` -> `Student(schoolId, id)` (requires `@@unique([schoolId, id])` on Student and ParentAccount).
- **Effort:** S-M   **Dependencies:** DB-001

### DB-013 - Dead or stale schema elements
- **Category:** Database
- **Severity:** P4   **Confidence:** High   **Status:** Confirmed
- **Evidence:** No code references `GeneratedReportJob` (grep over `lib`, `app`: none; 0 local rows), `MonthlyReport.pdfUrl`, `YearlyReport.pdfUrl`; `School.studentCount/teacherCount` are informational ints replaced by live counts (`lib/schools.js:42-64`); `SchoolAdmin.permissions Json` and the header comments in `schema.prisma:23-66` describe a pre-RBAC cut-over that is partly done (see REL-003). `FeeStructureItem.required` and late-fee columns were "captured for future" per the schema comment at `:508-511` (late fee is now used, `required` not).
- **Impact:** Misleading model surface; maintenance cost.
- **Recommended fix:** Remove or mark as planned; refresh header comments.
- **Effort:** S

## Data-integrity checks run on the local DB (all read-only)
| Check | Result |
|---|---|
| Students without a matching Class row (school, name, session) | 0 |
| Students without a StudentEnrollment | 0 |
| Students whose section differs from their current-session enrollment | 0 |
| StudentFee without items / `totalAmount` != sum(items) | 0 / 0 |
| StudentFee `paidAmount` != sum(SUCCESS payments) | 0 |
| StudentFee `paidAmount` > `totalAmount` | 0 |
| Payment whose school differs from its student's school | 0 |
| Attendance record ids not in Students | 0 |
| Teachers sharing a `loginEmail` | 1 group of 4 |
| Teachers with no linked `User` row | 17 of 26 (also 1 ParentAccount, 1 SchoolAdmin) |
| Two class-teacher assignments per session / two Active sessions per school | 0 / 0 |
| PENDING Razorpay payments | 9 (vs 4 SUCCESS) |
| Dates not matching the 10-char ISO shape | 0 (attendance, admission) |

## FK / onDelete summary (from `pg_constraint`, local DB)
- Cascade: Section->Class; ExamSchedule/ExamMark/ExamResult/ExamAuditLog->Exam; ExamMark->ExamSchedule; Student-> ExamMark, ExamResult, ExamOptionalEnrollment, StudentEnrollment, StudentPromotionLog, ParentNotification, ParentStudentLink; ParentStudentLink->ParentAccount; fee structure terms/items; StudentFeeItem->StudentFee; report children->MonthlyReport; SubjectTestMark->SubjectTest; TeacherNotification->Teacher; SupportTicketReply->Ticket; RolePermission.
- Restrict: every `School` FK; StudentFee/Payment/MonthlyReport/YearlyReport/SubjectTestMark -> Student; Payment->StudentFee; StudentEnrollment->Class/AcademicSession; SubjectTest->Teacher/Subject; TeacherLeave->Teacher; User->Role.
- SetNull: Section.classTeacherId, StudentEnrollment.sectionId, the `userId` links on SuperAdmin/SchoolAdmin/Teacher/ParentAccount, User.schoolId, Exam.parentExamId.
- Plain strings (no FK, historical attribution): Notice.postedByTeacherId, Homework.assignedByTeacherId, ExamMark.enteredByTeacherId/verifiedByAdminId, ExamAuditLog.actorId, SupportTicket.raisedByUserId, PushToken.ownerId, MonthlyReport.lockedByUserId, ParentNotification.sourceId.

## Positive observations
- Tenant-scoped composite uniques for admission id, employee id, class, subject, session, attendance, fee structure and timetable; every tenant-owned business table carries an indexed `schoolId` or hangs off one.
- Razorpay ids are unique (`schema.prisma:1438-1439`) and the verify path handles duplicate delivery.
- Fee generation is idempotent by `@@unique([studentId, academicSession, term])` and snapshots items so structure edits never rewrite paid fees.
- `StudentEnrollment` plus `StudentPromotionLog` now capture session/class/section history, and promotion runs in one transaction (`lib/students.js:744-777`); `ExamResult` freezes class/section at generation.
- Student delete is blocked when billing history exists; Class and level-rename are blocked while students reference them (`lib/classes.js:289-367`).
- Local data is internally consistent on every orphan check above.

## Limitations / not assessed
- Production database (Supabase/Sydney) not touched per rules; indexes, row counts, bloat and connection settings there were not inspected. Local DB has 3 schools and ~190 students, so no scale conclusions come from it.
- No EXPLAIN ANALYZE, no load test; index recommendations are pattern-based.
- Backup, PITR, retention and restore procedures: not assessable from the repo.
- Column-level encryption of Aadhaar numbers/bank details (stored as plain columns such as `Student.aadhaarNumber` and in the `Teacher.bankDetails` JSON) is a privacy topic owned by another auditor.
