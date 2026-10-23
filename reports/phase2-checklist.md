# Phase 2 - the ten bugs (batch 1)

Checked on a local server and the local database. Nothing deployed, nothing committed.

- [x] **1. Marks edited after results exist** (BIZ-006) - `lib/examMarks.js`, `lib/examResults.js`
  - An admin correcting a mark keeps its Approved / Published status (it used to fall back to Draft), the student's result is recalculated and keeps its own status, all rows are saved together or not at all, and a student who is not part of that exam schedule is refused.
- [x] **2. Attendance history after a class or section change** (BIZ-007) - `lib/attendance.js`
  - Reports and the student's month / session view now look up attendance by student, not by the student's current class, so earlier days stay.
- [x] **3. Promotion** (BIZ-008) - `lib/students.js`, `app/api/students/promote/route.js`
  - Promote and retain are one transaction; only Active students; the target class must be above the current one; a student cannot be in both lists; the result says how many still owe fees from the old session (shown after saving).
- [x] **4. Deleting a student with exam marks** (DB-005) - `lib/students.js`
  - Refused with a clear message (set the status to Transferred Out / Graduated instead).
- [x] **5. "Today" in school time** (DB-006) - new `lib/schoolToday.js`, 23 places
  - Uses Asia/Kolkata (or `SCHOOL_TIMEZONE`) instead of the server's UTC clock: attendance, exams, fee terms, homework, staff check-in, dashboards.
- [x] **6. Payment taken but shown as failed (mobile)** (MOB-005) - `ParentFeesScreen.js`
  - Now says "Payment received... do not pay again" and refreshes the fees.
- [x] **7. Push token on logout** (MOB-004) - server `DELETE /api/notifications/register-token`, mobile logout
  - Logout removes this phone's token (only the owner can remove it) and clears the app's cached data.
- [x] **8. Session ended** (FE-004, MOB-003)
  - Web: any "Not signed in" answer sends the browser to the login page with "Your session has ended" (`components/SessionWatcher.jsx`). Mobile: the app signs out and clears its cache.
- [x] **9. Notifications lost** (BIZ-009, OBS-006) - new `lib/background.js`
  - Notifications are finished after the response with Next's `after()`; a push to Expo is retried once.
- [x] **10. Popup closed by accident** (UX-001, part) - `components/Modal.jsx`
  - Closing a popup by clicking outside, Esc or X keeps what was typed for 5 minutes and puts it back when the same popup opens again for the same record (a note says so). Saving or Cancel discards it. Passwords and files are never kept. Fields drawn by custom controls (the custom dropdowns) are not captured.

## What was checked
- Backend: 27 checks (marks edit and recalculation, nothing half-saved, attendance after a section move, promotion refusals, delete refusal, notifications written after the response, push token removal, the school-time date).
- Real browser (headless Edge): popup draft kept and restored after an outside click, discarded after Cancel; a signed-out request lands on the login page with the message.
- Earlier suites re-run: Phase 0 (28), payments / documents / login (50), permissions (47). The only differences were test settings (needing the webhook and private-bucket variables) and redirects arriving inside HTTP 200.

## Not tested
- The mobile changes (6, 7, and the 401 sign-out) were only syntax-checked: they need a new app build and a phone. The server side of 7 was tested.
- The 5-minute limit was verified in the code, not by waiting five minutes.

## Size limits (API-006, PERF-005, PERF-011) - done

- [x] **Bulk import:** at most 1,000 students per file. The upload screen says so as soon as the file is read, and the server refuses a larger request (`BULK_IMPORT_MAX_ROWS` in `lib/bulkImportColumns.js`).
- [x] **Page size:** the payments and schools lists now cap `pageSize` at 100 (the students, teachers and other paged lists already did).
- [x] **Users list:** at most 500 per response.
- [x] **Support tickets:** the school sees the 100 most recently active, the Super Admin 200.
- Left for later (as agreed): `GET /api/students` (unused whole-school list), the mobile homework list, the Teacher roster filter.
- Checked: 8 requests (1001-row import refused and nothing imported; a small import still handled; huge page sizes cut to 100; users and ticket lists still work).

- [x] **`GET /api/students` is paged** (API-006): `?page=1&pageSize=50` (default 50, at most 100). The body is still a plain array; paging facts are in the headers `X-Total-Count`, `X-Page`, `X-Page-Size`, `X-Has-More`. A Teacher is limited to their own classes inside the query itself and gets only roster fields. Checked: 11 requests (page sizes, header values, page 2 differs from page 1, walking all pages returned all 190 students once, teacher scope and total).

## Speed fixes (PERF-001, 002, 005, 006; PERF-003 already done) - done

- [x] **Classes pages (PERF-001):** class and section counts now read only four columns (class, section, session, gender) instead of every student's full row with its Json blobs. The section page reads only that section's students. (`lib/classes.js`)
- [x] **Fee generation (PERF-002):** one class's students are read with a narrow select (not the whole school). New fees and their items are created with `createMany`; PENDING fees are re-synced with three bulk statements. A fee paid in the meantime is still left alone (checked again inside the transaction). (`lib/fees.js`)
- [x] **Bulk import (PERF-005):** checks only the admission numbers in the file (not the whole roster), runs the Class/Section upsert once per class+section, and bills new students ten at a time instead of all at once. A bad row still skips only itself. (`lib/students.js`, `app/api/students/bulk-import/route.js`)
- [x] **Promotion and retain (PERF-006):** enrollments are checked and created in one read and one `createMany`, and the audit log in one `createMany`, instead of per-student queries. A conflicting enrollment still rejects the whole batch. (`lib/students.js`)
- [x] **Dashboard attendance chart (PERF-003):** already counted inside Postgres (only small grouped rows reach Node); no change needed.
- Checked: 23 requests against the local production build (class/section counts equal the database for all 16 classes, section page lists its students, fee re-sync leaves all 50 fees identical, a missing fee is recreated with items and discount, a PAID fee untouched, import of 3 good + duplicate + bad class, promote + retain with enrollments and logs, repeat and conflicting requests refused with nothing moved). Test data removed afterwards.
- Not changed: the Student List report page still loads the full roster, because the printable report needs every student.

## Data and money (BIZ-005, BIZ-010, DB-007, DB-010, DB-011, DB-012, REL-001, REL-004, REL-005) - done, except where noted

- [x] **BIZ-010 exam rules:** an exam can only go Draft -> Published -> Completed (and back to Draft or reopened as Published); Draft -> Completed and Completed -> Draft are refused (`lib/exams.js`). "Generate Results" no longer touches a result that is already Published; the screen tells how many were left alone, and the admin unpublishes first to regenerate (`lib/examResults.js`, `ExamResultsClient.jsx`).
- [x] **DB-007 attendance:** the roster check already existed. Added a version check: the web board sends the `markedAt` it loaded; if someone saved in between, the save is refused with HTTP 409 and nothing is written (`lib/attendance.js`, `app/api/attendance/route.js`, `DailyAttendanceBoard.jsx`). The mobile app does not send it yet, so its saves work as before.
- [x] **BIZ-005 money records:** payments now store who collected them and a per-school receipt number (RCPT-000001...). New `FeeAuditLog` records every payment, reversal, discount and standing discount with who did it, written in the same transaction. New `POST /api/fees/payments/[id]/reverse` (needs `fees.refund`, reason required) marks a manual payment REVERSED and puts the amount back on the fee. Online (Razorpay) payments are refused there: refund them from the Razorpay dashboard. The payment ledger shows the receipt, the collector and a Reverse button.
- [x] **DB-010 database checks:** `paidAmount`/`totalAmount`/item amount cannot be negative and a payment amount must be above 0; receipt numbers come from an atomic per-school counter. Not done: freezing the late fee into the fee.
- [x] **DB-011 database rules:** one Active session per school and one Active class-teacher section per teacher per session are now partial unique indexes; the section forms show a clear message; `setActiveSession` archives the old one and activates the new one in one transaction.
- [x] **DB-012:** `ReportLocks.schoolId` is required, backfilled, and written by the lock/unlock code.
- [x] **REL-001 / REL-005 checks:** `lib/consistency.js` (read-only) reports fees whose `paidAmount` differs from their payments and active students whose class/section/session differ from their enrollment. It runs inside the reconcile cron and returns the counts. Not done: a single write function for student placement (all writers already go through the enrollment helpers).
- [x] **REL-004:** renaming a subject that a class, exam schedule, homework or teacher still uses is refused; renaming a section that still has students is refused.
- [ ] **DB-009 (enums): not done.** Free-text status columns hold values that need checking on the Sydney data first.
- Checked: 48 requests/queries on the local production build (all pass); earlier tests re-run (perf 23/23, bug-fix tests 26/27 where the one miss is the login-page text test that reads static HTML, while the browser test confirms the banner shows). All test data removed.
- **To apply on Sydney (not done):** run `prisma/manual/01-before-db-push.sql`, then `npx prisma db push`, then `prisma/manual/02-after-db-push.sql` (first check the two duplicate queries at the top of file 02 return nothing).

## Mobile app gaps (5 fixes) - code done, not run on a phone

- [x] **Dead buttons removed:** Yearly Report and Subject Tests (no screen exists) are gone from Student Reports; the Monthly Report list is now a read-only status list (no Import / Print / PDF / checkbox / tap that went nowhere).
- [x] **Notices and homework:** a Class Teacher can post a notice to their own class + section and edit or delete their own (`NoticesScreen.js`); a teacher can edit or delete homework they assigned (`HomeworkScreen.js`). Both use routes that already existed and already enforce the rules.
- [x] **Marks entry:** `EnterMarksScreen.js` now handles Grade and Remarks subjects, practical marks, and the Medical / Exempted / Re-Exam statuses (same rules as the web sheet). The exam schedule form already had marking type and practical; still missing in the app: weight and optional-subject enrolment.
- [x] **Student profile:** new `GET /api/students/[id]/profile` (Class Teacher of that section, or admin) and `GET /api/parent/student` (the signed-in parent's active child). Both return contact and placement details only, never Aadhaar, documents or fees (`toAppProfile` in `lib/students.js`). App: "View full profile" in the Students popup for the teacher's own class, and "Child Profile" on the parent's Profile tab (`features/student/`).
- [x] **Parent dead tile / button:** the Leave tile and the Settings button are removed.
- Checked: 16 requests on the local production build (profile scope, parent route, notice and homework create/edit/delete rules, marks sheet fields). App files were only syntax-checked and checked for undefined names; they need a new app build and a phone test.
