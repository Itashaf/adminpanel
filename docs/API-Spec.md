# API Specification

SchoolApp360 admin panel — REST API and web Server Action reference, generated from the actual implementation under `app/api/**` and `app/actions/**` (not a hand-written spec — every endpoint, request/response shape, and error path below was read directly from source).

Scope: Authentication, Students, Teachers, Attendance, Exams, Results, Finance. The codebase has additional modules (Classes, Notices, Homework, Leaves, Calendar Events, Notifications, Schools, Subjects, Timetable) not covered here.

## Conventions

- **Session cookie**: `edumanage_session`, httpOnly, 7-day expiry, set by web login. `getSession()` falls back to an `Authorization: Bearer <token>` header when no cookie is present (used by the mobile app).
- **Mobile auth**: `/api/auth/parent/login` and `/api/auth/teacher/login` return a signed JWT (`jose`, HS256, 7-day expiry) in the response body instead of a cookie.
- **Multi-tenancy**: every school-scoped query/mutation resolves `schoolId` server-side via `resolveSchoolId()` — never accepted from the client. Cross-tenant IDs 404 rather than leak.
- **`requireSchoolAdmin()`** (`lib/iam.js`): requires role `SchoolAdmin` or `SuperAdmin`; returns `403 { error: "Forbidden" }` for both "not signed in" and "wrong role" — there is no separate `401` from this guard.
- **`requireParent()` / `requireTeacher()`**: same pattern, scoped to a real signed-in session of that role (no dashboard demo-role-toggle fallback).
- **Class-Teacher-only scoping**: several Teacher-facing endpoints (Students, Attendance, Assessments) intentionally scope to `currentUser.classTeacherOf || []` directly, not the broader `assignedClasses` (subject-teacher) set — this is a deliberately narrower rule than "any teacher of a subject in this class."
- Response bodies below are illustrative shapes with representative field types, not literal fixture data.

---

## Authentication

### POST /api/auth/parent/login

Mobile counterpart to the `parentLoginAction` Server Action — returns a Bearer JWT instead of setting a cookie.

**Authorization:** None (public)

**Request:**
```json
{ "email": "string", "password": "string" }
```

**Response (200):**
```json
{
  "token": "string (signed JWT, 7-day expiry, payload: { role: 'Parent', id, schoolId, activeStudentId, email })",
  "activeStudentId": "string (first linked student's id)",
  "students": [
    {
      "id": "string",
      "name": "string (firstName + lastName)",
      "class": "string",
      "section": "string",
      "admissionId": "string",
      "academicSession": "string",
      "photoUrl": "string | null"
    }
  ]
}
```

**Error Responses:**
- `400` — `{ "error": "Missing fields" }` — email or password not provided
- `401` — `{ "error": "Invalid email or password." }` — from `validateParentCredentials`
- `401` — `{ "error": "This account has no linked students." }`
- `429` — `{ "error": "Too many login attempts. Please try again later." }`, with `Retry-After` header (seconds)

---

### POST /api/auth/parent/switch

Mobile counterpart to `switchActiveChildAction` — returns a fresh JWT with the new `activeStudentId` (a mobile client has no cookie to silently reissue).

**Authorization:** Session (cookie or Bearer token, via `getSession()`) — role must be `Parent`, checked inline.

**Request:**
```json
{ "studentId": "string" }
```

**Response (200):**
```json
{ "token": "string (fresh JWT, activeStudentId updated)", "activeStudentId": "string" }
```

**Error Responses:**
- `401` — `{ "error": "Not signed in." }`
- `400` — `{ "error": "Missing studentId" }`
- `403` — `{ "error": "Not your child." }` — `verifyParentOwnsStudent` finds no matching link

---

### POST /api/auth/teacher/login

Mobile counterpart to `teacherLoginAction` — signs a real `edumanage_session`-shaped JWT (role `Teacher`).

**Authorization:** None (public)

**Request:**
```json
{ "email": "string", "password": "string" }
```

**Response (200):**
```json
{
  "token": "string (signed JWT, 7-day expiry)",
  "teacher": { "id": "string", "name": "string", "email": "string" }
}
```

**Error Responses:**
- `400` — `{ "error": "Missing fields" }`
- `401` — `{ "error": "Invalid email or password." }`
- `401` — `{ "error": "Login access has not been enabled for this account. Contact your school admin." }`
- `401` — `{ "error": "Your account has been suspended. Contact your school admin." }`
- `429` — `{ "error": "Too many login attempts. Please try again later." }`, with `Retry-After` header

---

### GET /api/iam/me

The single "who am I" endpoint for the whole app.

**Authorization:** Session cookie or Bearer token, resolved via `getCurrentUserInfo()` — any signed-in role.

**Request:** None

**Response (200):**
```json
{
  "user": {
    "id": "string",
    "name": "string",
    "email": "string",
    "role": "SuperAdmin | SchoolAdmin | Parent | Teacher",
    "...": "role-specific fields — SchoolAdmin: schoolId, schoolName, permissions; Parent: studentId (active child), students[]; Teacher: teacherId, assignedClasses[], classTeacherOf[]"
  }
}
```

**Error Responses:**
- `401` — `{ "error": "Not signed in." }`

---

### POST /api/teacher/change-password

**Authorization:** `requireTeacher()`.

**Request:**
```json
{ "currentPassword": "string", "newPassword": "string" }
```

**Response (200):**
```json
{ "success": true }
```

**Error Responses:**
- `403` — `{ "error": "Forbidden" }`
- `400` — `{ "error": "Teacher not found." }` / `{ "error": "No password set for this account yet." }` / `{ "error": "Current password is incorrect." }` / `{ "error": "New password must be at least 8 characters." }`

---

### POST /api/parent/change-password

**Authorization:** `requireParent()`.

**Request:**
```json
{ "currentPassword": "string", "newPassword": "string" }
```

**Response (200):**
```json
{ "success": true }
```

**Error Responses:**
- `403` — `{ "error": "Forbidden" }`
- `400` — `{ "error": "Parent account not found." }` / `{ "error": "Current password is incorrect." }` / `{ "error": "New password must be at least 8 characters." }`

---

### Web Authentication — Server Actions (`app/actions/auth.js`)

These are Next.js Server Actions called directly from Client Components (`'use server'`), not discoverable REST paths — this is the primary web auth mechanism. Failures return `{ error }` (never thrown, since thrown errors are redacted to an opaque digest in production).

| Action                                        | Auth                           | Request                  | Success                                                  | Notes                                                                                              |
| --------------------------------------------- | ------------------------------ | ------------------------ | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `superAdminLoginAction({ email, password })`  | None                           | `{ email, password }`    | `redirect('/super-admin/schools')` after `createSession` | Rate-limited via `checkLoginRateLimit`                                                             |
| `schoolAdminLoginAction({ email, password })` | None                           | `{ email, password }`    | `redirect('/dashboard')`                                 | Steps into the admin's school tenant context; rate-limited                                         |
| `teacherLoginAction({ email, password })`     | None                           | `{ email, password }`    | `redirect('/dashboard')`                                 | Rate-limited                                                                                       |
| `parentLoginAction({ email, password })`      | None                           | `{ email, password }`    | `redirect('/parent')`                                    | Errors if account has no linked students; rate-limited                                             |
| `switchActiveChildAction(studentId)`          | Parent session                 | `studentId` (positional) | `{ success: true }`                                      | Verifies `verifyParentOwnsStudent` before switching                                                |
| `logoutAction()`                              | None                           | —                        | `{ success: true }`                                      | Clears session cookie                                                                              |
| `requestPasswordResetAction({ email })`       | None                           | `{ email }`              | `{ message: "Password reset link sent", email }`         | Teacher-only today; same response whether or not the email matches a real account (no enumeration) |
| `setPasswordAction({ token, password })`      | None (token is the credential) | `{ token, password }`    | `{ success: true }`                                      | Single-use, time-limited token from the reset email                                                |

**Common errors:** `{ "error": "Missing fields" }`; credential-validation errors from `validateSuperAdminCredentials` / `validateAdminCredentials` / `validateTeacherCredentials` / `validateParentCredentials`; `{ "error": "This account has no linked students — contact your school administrator." }` (parent login); `{ "error": "Not signed in." }` / `{ "error": "Not your child." }` (switch child); `{ "error": "Email is required" }` (reset request); `{ "error": "This link is invalid or has expired. Ask your school admin to send a new one." }` (set password).

**Rate limiting (`lib/auth/loginRateLimit.js`):** in-memory (per warm server instance, not Redis), 15-minute sliding window, applied via `checkLoginRateLimit(headersLike, email)`:
- 8 attempts per account (lowercased email)
- 20 attempts per IP (`x-forwarded-for`) — credential-spraying protection

Whichever limit trips first wins; the check runs before any password-hash comparison. Exceeding either limit returns `429` with `{ "error": "Too many login attempts. Please try again later." }` and a `Retry-After` header. Applied to both mobile REST login routes and the four web Server Action logins.

---

## Students

### GET /api/students

**Authorization:** `getCurrentUserInfo()`. `SchoolAdmin`/`SuperAdmin` get the full roster. `Teacher` gets a class-scoped, field-stripped roster (`getTeacherClassScope` = `assignedClasses` + `classTeacherOf`). Any other role/unauthenticated is rejected. Returns the whole roster as a flat array (kept for the mobile app) — not paginated; see `paged` below for the dashboard's paginated variant.

**Request:** None.

**Response (200) — Admin:** array of full decorated Student objects (`id, admissionId, photoUrl, firstName, lastName, class, section, academicSession, dob, gender, bloodGroup, guardian{}, secondaryGuardian{}, emergencyContacts{}, address{}, feeDetails{}, documents{}, discountType, discountValue, discountReason, status, ...`).

**Response (200) — Teacher (field-stripped):**
```json
[{ "id": "", "admissionId": "", "firstName": "", "lastName": "", "initials": "", "class": "", "section": "", "academicSession": "", "status": "" }]
```

**Error Responses:**
- `401` — not signed in
- `403` — role is neither Admin nor Teacher

---

### POST /api/students

**Authorization:** `requireSchoolAdmin()`.

**Request:** full "Add Student" form (`firstName`, `lastName`, `admissionNumber` required; plus `class`, `section`, `academicSession`, `dob`, `gender`, `guardian{}`, `secondaryGuardian{}`, address, fee details, document URLs, etc.). Side effect: upserts a matching `Class`/`Section` row if `class` is recognized.

**Response (200):**
```json
{ "id": "string", "admissionId": "string" }
```

**Error Responses:**
- `400` — missing required fields, or admission number already in use (P2002)
- `403` — not Admin

---

### GET /api/students/paged

**Authorization:** `getCurrentUserInfo()` — `SchoolAdmin`/`SuperAdmin`/`Teacher`. For Teacher, `scopePairs = actor.classTeacherOf || []` enforced at the Prisma query level (empty scope → explicitly empty result, not unscoped). The dashboard table's real pagination source.

**Request (query):** `?page=1&pageSize=10&search=&class=&section=&status=` (`pageSize` clamped to 1-100; `search` matches name/admissionId/guardian phone).

**Response (200):**
```json
{ "students": [ /* full or teacher-stripped Student objects */ ], "total": 0, "page": 1, "pageSize": 10 }
```

**Error Responses:**
- `401` — not signed in
- `403` — role not Admin/Teacher

---

### GET /api/students/print-details

**Authorization:** `getCurrentUserInfo()` — Teacher only (Admin gets 403 here; this route is for the mobile Printables module). Scoped to `classTeacherOf` at query level. Deliberately exposes guardian/address/DOB fields to Teacher (mirrors an already-teacher-visible web print page).

**Request (query, both required):** `?class=<string>&section=<string>`

**Response (200):**
```json
{ "students": [{ "id": "", "admissionId": "", "name": "", "dob": "", "gender": "", "fatherName": "", "motherName": "", "guardianPhone": "", "address": "" }] }
```

**Error Responses:**
- `401` — not signed in
- `403` — role is not Teacher
- `400` — missing `class` or `section`

---

### GET /api/students/{id}

**Authorization:** `requireSchoolAdmin()` (no Teacher access to this single-record route).

**Response (200):** full decorated Student object.

**Error Responses:**
- `403` — not Admin
- `404` — not found in this school

---

### PUT /api/students/{id}

**Authorization:** `requireSchoolAdmin()`.

**Request:** same shape as `POST /api/students`.

**Response (200):**
```json
{ "id": "string", "admissionId": "string" }
```
Side effect: deletes the old R2 photo object if `photoUrl` changed.

**Error Responses:**
- `400` — missing required fields, or admission number conflict (P2002)
- `403` — not Admin
- `404` — not found

---

### DELETE /api/students/{id}

**Authorization:** `requireSchoolAdmin()`.

**Response (200):**
```json
{ "removed": true }
```

**Error Responses:**
- `400` — Prisma P2003 (student has Fee/Payment rows, `onDelete: Restrict`) — message suggests setting status to TransferredOut/Graduated instead
- `403` — not Admin
- `404` — not found

---

### POST /api/students/{id}/discount

**Authorization:** `requireSchoolAdmin()`. Sets a standing discount on the Student row (distinct from a per-fee discount — see Finance section).

**Request:**
```json
{ "discountType": "FIXED | PERCENT", "discountValue": 100, "discountReason": "string (optional)" }
```

**Response (200):**
```json
{ "discountType": "FIXED", "discountValue": 100, "discountReason": null }
```

**Error Responses:**
- `400` — invalid type, non-positive value, percent > 100, or student not found
- `403` — not Admin

---

### DELETE /api/students/{id}/discount

**Authorization:** `requireSchoolAdmin()`.

**Response (200):**
```json
{ "discountType": null, "discountValue": null, "discountReason": null }
```

**Error Responses:**
- `400` — student not found
- `403` — not Admin

---

### POST /api/students/{id}/discount/apply-pending

**Authorization:** `requireSchoolAdmin()`. Applies the student's standing discount to every `PENDING`/`PARTIAL` `StudentFee` (skips a fee if it would drop payable below what's already collected).

**Response (200):**
```json
{ "appliedCount": 0, "skippedCount": 0 }
```

**Error Responses:**
- `400` — student not found, or no standing discount set
- `403` — not Admin

---

### GET /api/students/{id}/portal-access

**Authorization:** `requireSchoolAdmin()`.

**Response (200):** linked `ParentAccount` (`{ id, email, name, photoUrl, students: [...] }`) or `null`.

**Error Responses:**
- `403` — not Admin

---

### POST /api/students/{id}/portal-access

**Authorization:** `requireSchoolAdmin()`. Links to an existing `ParentAccount` by email if one matches, else creates a new one with a generated temp password.

**Request:**
```json
{ "email": "string (required)", "name": "string (optional)" }
```

**Response (200):**
```json
{ "isNewAccount": true, "tempPassword": "string | null (reveal-once; null when linking to existing)", "account": { "id": "", "email": "", "students": [] } }
```

**Error Responses:**
- `400` — student not found, missing/empty email
- `403` — not Admin

---

### DELETE /api/students/{id}/portal-access

**Authorization:** `requireSchoolAdmin()`. Unlinks the student (`ParentStudentLink` deleted) without deleting the parent account (siblings retain access).

**Response (200):**
```json
{ "success": true }
```

**Error Responses:**
- `403` — not Admin
- `404` — no linked account

---

### POST /api/students/{id}/portal-access/reset-password

**Authorization:** `requireSchoolAdmin()`.

**Response (200):**
```json
{ "tempPassword": "string", "account": { "id": "", "email": "", "students": [] } }
```

**Error Responses:**
- `400` — no linked parent account
- `403` — not Admin

---

### POST /api/students/photo-upload-url / POST /api/students/document-upload-url

**Authorization:** `requireSchoolAdmin()`. Presign-then-PUT-direct-to-R2 (file bytes never transit the Next.js server).

**Request:**
```json
{ "fileName": "string", "fileType": "string (image/jpeg|png|webp for photo; +application/pdf for document)", "fileSize": "number (max 2MB photo, max 5MB document)" }
```

**Response (200):**
```json
{ "uploadUrl": "string (presigned PUT URL)", "publicUrl": "string", "key": "string" }
```

**Error Responses:**
- `400` — disallowed `fileType`, or missing/oversized `fileSize`
- `403` — not Admin

---

### POST /api/students/bulk-import

**Authorization:** `requireSchoolAdmin()`.

**Request:**
```json
{ "rows": [{ "admissionNumber": "", "firstName": "", "lastName": "", "class": "", "section": "", "fatherName": "", "fatherPhone": "", "motherName": "", "motherPhone": "", "addressLine1": "", "...": "..." }] }
```
Rows inserted one at a time (not a single transaction); a row is skipped (not fatal) on duplicate admission number or unrecognized class.

**Response (200):**
```json
{ "importedCount": 0, "imported": [ /* full Student objects */ ], "skipped": [{ "row": {}, "reason": "string" }] }
```

**Error Responses:**
- `400` — `rows` missing/empty/not an array
- `403` — not Admin

---

### GET /api/students/bulk-import/template — GET /api/students/bulk-import/blank-template

**Authorization:** None — no guard at all.

**Response (200):** binary `.xlsx` download (sample-filled or header-only respectively).

**Error Responses:** None defined.

---

**Notable patterns:** Multi-tenancy enforced via `resolveSchoolId()` scoping on every query. Class-Teacher scoping is applied differently per route — `GET /api/students` filters in JS after a narrowed `select`; `paged`/`print-details` enforce it at the Prisma query level (`scopePairs`). No `app/api/students/**` route uses `requireParent()` — parent-side student access lives under `app/api/parent/**`, out of scope here.

---

## Teachers

Every route below uses `requireSchoolAdmin()` (403 for anyone else, no separate 401). `schoolId` is always resolved via `resolveSchoolId()`, never from the client.

### POST /api/teachers

**Request:** `firstName`, `lastName`, `employeeId`, `email`, `dob`, `gender`, `joiningDate` required; plus `phone`, `bloodGroup`, `aadhaarNumber`, `qualification`, `experience`, `employmentType`, `photoUrl`, education/bank/emergency-contact/address blocks, document URLs, `loginAccessEnabled`, `loginEmail`.

**Response (200):**
```json
{ "id": "string", "employeeId": "string", "firstName": "string", "lastName": "string", "loginInviteSent": true }
```

**Error Responses:**
- `400` — missing required fields, or `employeeId` already in use
- `403` — not Admin

---

### GET /api/teachers/paged

**Request (query):** `?page=1&pageSize=10&search=&status=&class=` (`search` matches name/employeeId/phone/email; `class` filters by `assignments` JSON containing that class). No plain `GET /api/teachers` (full-array) route exists.

**Response (200):**
```json
{ "teachers": [ /* decorated teacher objects incl. loginAccess{}, assignments[], classTeacherOf[] */ ], "total": 0, "page": 1, "pageSize": 10 }
```

**Error Responses:**
- `403` — not Admin

---

### PUT /api/teachers/{id}

**Request:** same shape as `POST /api/teachers`.

**Response (200):**
```json
{ "id": "string", "employeeId": "string" }
```

**Error Responses:**
- `400` — missing required fields, or duplicate `employeeId`
- `403` — not Admin
- `404` — teacher not found

---

### PATCH /api/teachers/{id}/status

**Request:**
```json
{ "status": "string (required)" }
```

**Response (200):**
```json
{ "id": "string", "status": "string" }
```

**Error Responses:**
- `400` — missing `status`
- `403` — not Admin
- `404` — not found

---

### POST /api/teachers/{id}/assignments

**Request:**
```json
{ "academicSession": "string (required)", "class": "string (required)", "section": "string (required if the class has real sections)", "subject": "string" }
```

**Response (200):** full decorated teacher object with the new assignment appended (`{ id, academicSession, class, section, subject, status: "Active" }`).

**Error Responses:**
- `400` — missing `academicSession`/`class`, or missing `section` when required
- `403` — not Admin
- `404` — not found
- `409` — duplicate assignment, or invalid subject

---

### DELETE /api/teachers/{id}/assignments

**Request:**
```json
{ "assignmentId": "string (required)" }
```

**Response (200):** full decorated teacher object with that assignment removed.

**Error Responses:**
- `400` — missing `assignmentId`
- `403` — not Admin
- `404` — not found

---

### POST /api/teachers/{id}/reset-password

**Request:** none. Generates a password-set token (7-day TTL) and emails the teacher a reset link — does not return a password to the admin.

**Response (200):**
```json
{ "success": true }
```

**Error Responses:**
- `403` — not Admin
- `404` — teacher not found, or has no login access enabled

---

### POST /api/teachers/photo-upload-url / POST /api/teachers/document-upload-url

Presign-then-PUT-direct-to-R2, same pattern as Students. Photo: max 2MB, JPG/PNG/WEBP. Document (certificates, Aadhaar): max 5MB, PDF/JPG/PNG/WEBP.

**Request:**
```json
{ "fileName": "string", "fileType": "string", "fileSize": "number" }
```

**Response (200):**
```json
{ "uploadUrl": "string", "publicUrl": "string", "key": "string" }
```

**Error Responses:**
- `400` — disallowed type or oversized file
- `403` — not Admin

---

## Attendance

### POST /api/attendance

**Authorization:** No blanket `require*` guard — actor resolved via `getCurrentUserInfo() || getCurrentUser()`. If `role === 'Teacher'`, enforced via `isClassInTeacherScope(currentUser.classTeacherOf || [], ...)` — correctly Class-Teacher-only (not merged with subject-teacher assignments). Non-Teacher roles pass unrestricted. Also gated by `computeAttendanceAccess()` (deadline/grace-period), but `ATTENDANCE_LOCK_ENABLED = false` currently makes this a no-op.

**Request:**
```json
{
  "academicSession": "2025-26", "date": "YYYY-MM-DD", "className": "string", "sectionName": "string",
  "records": [{ "studentId": "string", "status": "Present | Absent | Leave", "remark": "string" }],
  "markedBy": "string"
}
```
(No `Late` status exists as a settable value — a `Late` bucket in the internal summarizer is dead code.)

**Response (200):**
```json
{ "id": "string", "academicSession": "", "date": "", "className": "", "sectionName": "", "markedBy": "", "markedAt": "ISO", "manuallyUnlocked": false, "records": [] }
```
`manuallyUnlocked` always resets to `false` on save.

**Error Responses:**
- `400` — missing `academicSession`/`date`/`className`/`sectionName`/`records`
- `403` — Teacher's class/section not in `classTeacherOf`

---

### GET /api/attendance/roster

**Authorization:** Same actor resolution; Teacher gated by `classTeacherOf` scoping.

**Request (query):** `?session=&date=&class=&section=`

**Response (200):**
```json
{
  "students": [{ "id": "", "name": "", "admissionId": "" }],
  "existingRecord": null,
  "attendanceTaken": false,
  "access": { "allowed": true, "reason": "" },
  "teacherAccess": { "allowed": true, "reason": "" },
  "attendanceSettings": { "deadlineTime": "14:00", "graceMinutes": 30 }
}
```

**Error Responses:**
- `400` — missing required query params
- `403` — Teacher outside scope

---

### GET /api/attendance/report

**Authorization:** Same pattern, Class-Teacher-only for Teacher.

**Request (query):** `?session=&class=&section=&from=&to=` (`to` defaults today, `from` defaults `to` minus 29 days).

**Response (200):**
```json
{
  "from": "", "to": "",
  "students": [{ "studentId": "", "name": "", "total": 0, "Present": 0, "Absent": 0, "Leave": 0, "percent": 0 }],
  "trend": [{ "date": "", "percent": 0, "present": 0, "total": 0 }]
}
```

**Error Responses:**
- `400` — missing required params
- `403` — Teacher outside scope

---

### GET /api/attendance/student/{id}

**Authorization:** `getCurrentUserInfo()`. Only the `Parent` case is guarded (`actor.studentId !== id` returns 403); every other role is unguarded — not part of the Class-Teacher-only pattern (known gap).

**Request (query):** `?month=YYYY-MM&scope=session (optional)`

**Response (200), default:**
```json
{ "total": 0, "Present": 0, "Absent": 0, "Leave": 0, "percent": 0, "days": [{ "date": "", "status": "Present | null" }] }
```
**Response (200), `?scope=session`:** same summary without `days`.

**Error Responses:**
- `403` — Parent requesting a student that isn't their own
- `404` — student not found

---

### PATCH /api/attendance/{id}/lock

**Authorization:** Blanket role check — `Teacher` always gets 403 (Teachers can never lock/unlock; Admins can unlock any record school-wide, no class-scope needed).

**Request:**
```json
{ "unlocked": true }
```

**Response (200):** updated Attendance row (same shape as `POST /api/attendance`).

**Error Responses:**
- `403` — caller is a Teacher
- `404` — no such Attendance row

---

### GET /api/attendance/check-in / POST /api/attendance/check-in

**Authorization:** `requireTeacher()` — real signed-in Teacher session required (no demo-role-toggle fallback).

**Request:** none.

**Response (200) GET:**
```json
{ "date": "", "checkedIn": true, "checkInAt": "ISO", "status": "Present" }
```
**Response (200) POST:** idempotent (a second same-day call returns the original `checkInAt`).
```json
{ "date": "", "teacherId": "", "status": "Present", "checkInAt": "ISO" }
```

**Error Responses:**
- `403` — not a real Teacher session

---

### GET /api/attendance/my-summary

**Authorization:** `requireTeacher()`.

**Request (query):** `?month=YYYY-MM`

**Response (200):**
```json
{ "month": "", "Present": 0, "Absent": 0, "Leave": 0, "total": 0, "days": [{ "date": "", "status": "" }] }
```

**Error Responses:**
- `403` — not a real Teacher session

---

### GET /api/staff-attendance / POST /api/staff-attendance

**Authorization:** `requireSchoolAdmin()` — admin-only staff attendance roster (self-service goes through `check-in` instead).

**Request GET (query):** `?date=YYYY-MM-DD`

**Response (200) GET:**
```json
{
  "date": "", "roster": [{ "teacherId": "", "name": "", "status": "Present | null", "checkInAt": null }],
  "isMarked": false, "markedBy": null, "markedAt": null
}
```

**Request POST:**
```json
{ "date": "YYYY-MM-DD", "records": [{ "teacherId": "string", "status": "Present | Absent | Leave", "remark": "string" }] }
```

**Response (200) POST:**
```json
{ "date": "", "markedBy": "", "markedAt": "ISO", "records": [] }
```

**Error Responses:**
- `400` — missing `date` (GET), or missing `date`/`records` (POST)
- `403` — not Admin

---

## Exams

### GET /api/exams

**Authorization:** Signed-in only, filtered by `getVisibleExams(currentUser)` — Teacher sees exams for classes they're assigned to or Class Teacher of; Parent sees non-Draft exams with schedules for their active child's class; Admin sees all.

**Response (200):**
```json
[{ "id": "", "name": "", "academicSession": "", "examType": "", "startDate": "", "endDate": "", "classes": [], "status": "Draft | Published | Completed", "parentExamId": null, "retakeResultPolicy": "Best | Latest | Average" }]
```

**Error Responses:**
- `401` — not signed in

---

### POST /api/exams

**Authorization:** `requireSchoolAdmin()`.

**Request:**
```json
{ "name": "string (required)", "academicSession": "string (required)", "examType": "string (required)", "startDate": "YYYY-MM-DD (required)", "endDate": "YYYY-MM-DD (required)", "classes": ["string"], "description": "string", "parentExamId": "string | null", "retakeResultPolicy": "Best | Latest | Average (default Latest)" }
```

**Response (200):** same Exam shape as GET, `status: 'Draft'`.

**Error Responses:**
- `400` — missing required fields, or `parentExamId` doesn't reference an existing exam
- `403` — not Admin

---

### GET /api/exams/{id}

**Authorization:** Signed-in only, no visibility filtering at this route.

**Response (200):** Exam shape + embedded `schedules[]` (`subject, className, sectionName, examDate, startTime, endTime, maxMarks, passingMarks, examMode, room, invigilator`).

**Error Responses:**
- `401` — not signed in
- `404` — not found

---

### PUT /api/exams/{id} / DELETE /api/exams/{id}

**Authorization:** `requireSchoolAdmin()`.

**Request (PUT):** same shape as `POST /api/exams`.

**Response (200):** updated Exam shape (PUT) / `{ "success": true }` (DELETE).

**Error Responses:**
- `400` — missing fields, or thrown error
- `403` — not Admin
- `404` — not found

---

### PUT /api/exams/{id}/status

**Authorization:** Signed-in at route layer (401 if not); real check inside `assertCanSetExamStatus` — Admin can set any status; a Teacher can only set `Published`, and only if Class Teacher of a section in the exam's classes. Violations surface as `400`, not `403`.

**Request:**
```json
{ "status": "Draft | Published | Completed" }
```

**Response (200):** updated Exam shape. Publishing triggers `notifyExamPublished` and audit-logs `ExamStatusChanged`.

**Error Responses:**
- `400` — missing/invalid `status`, or authorization failure
- `401` — not signed in
- `404` — not found

---

### POST /api/exams/{id}/duplicate

**Authorization:** `requireSchoolAdmin()`. Copies the exam (name suffixed " (Copy)", `status: 'Draft'`) plus all its schedule rows (marks/practical/optional fields not copied). No audit log entry.

**Response (200):** new Exam shape.

**Error Responses:**
- `400` — thrown error
- `403` — not Admin
- `404` — source not found

---

### GET /api/exams/{id}/progress / GET /api/exams/{id}/audit-log / GET /api/exams/dashboard

**Authorization:** Signed-in AND role SchoolAdmin/SuperAdmin, checked inline (not via `requireSchoolAdmin`) — wrong role returns `401`, not `403` (inconsistent with the rest of this surface).

**Response (200) progress:**
```json
[{ "scheduleId": "", "subject": "", "totalStudents": 0, "entered": 0, "pending": 0, "absent": 0 }]
```
**Response (200) audit-log:**
```json
[{ "id": "", "action": "ExamCreated | ExamStatusChanged | ScheduleUpdated | MarksApproved | MarksRejected | MarksUnlocked | ResultPublished | ResultUnpublished", "actorName": "", "meta": {}, "createdAt": "ISO" }]
```
**Response (200) dashboard:**
```json
{ "totalExams": 0, "upcomingExams": 0, "resultsPending": 0, "subjectsProgress": {}, "examStatusBreakdown": {}, "upcomingExamsList": [], "recentActivity": [] }
```

**Error Responses:**
- `401` — not signed in, or wrong role

---

### GET /api/exams/{id}/verification

**Authorization:** Signed-in AND SchoolAdmin/SuperAdmin (401 for wrong role).

**Request (query):** `?className=<required>&sectionName=<optional>&subject=<required>`

**Response (200):**
```json
{ "schedule": { "maxMarks": 0, "passingMarks": 0, "markingType": "Numeric | Grade | Remarks" }, "marks": [{ "studentId": "", "marksObtained": null, "status": "Draft | Submitted | UnderReview | Approved | Published" }] }
```

**Error Responses:**
- `400` — missing `className`/`subject`
- `401` — not signed in, or wrong role
- `404` — no matching schedule

---

### GET /api/exams/{id}/schedules / POST /api/exams/{id}/schedules

**Authorization GET:** Signed-in, filtered by `getVisibleExamSchedules` (Parent: non-Draft + matching class/section; Teacher: subject-taught or Class Teacher rows; Admin: all).

**Authorization POST:** Signed-in at route layer; real check via `assertCanManageSchedule` — Admin always allowed, Teacher only if Class Teacher of `className` (their `sectionName` is always forced to `''`, whole-class, server-side).

**Request POST:**
```json
{ "subject": "string (required)", "className": "string (required)", "examDate": "YYYY-MM-DD (required, within exam window)", "maxMarks": "number (required)", "passingMarks": "number (max maxMarks)", "sectionName": "string", "markingType": "Numeric | Grade | Remarks", "hasPractical": "boolean", "practicalMaxMarks": "number (required if hasPractical)", "isOptional": "boolean" }
```

**Response (200):** schedule row(s), same shape as `GET /api/exams/{id}` embedded schedules.

**Error Responses:**
- `400` — missing fields, invalid marks, date outside window, invalid subject, duplicate schedule (P2002), or Teacher-authorization error
- `401` — not signed in

---

### PUT /api/exams/schedules/{scheduleId} / DELETE /api/exams/schedules/{scheduleId}

**Authorization:** Signed-in at route layer; real check via `assertCanManageSchedule` against the row's existing class/section.

**Response (200):** updated schedule row (PUT) / `{ "success": true }` (DELETE).

**Error Responses:**
- `400` — missing fields, invalid marks, duplicate, or authorization error
- `401` — not signed in
- `404` — not found

---

### GET /api/exams/schedules/{scheduleId}/enrollments / PUT /api/exams/schedules/{scheduleId}/enrollments

**Authorization:** `requireSchoolAdmin()`. For optional/elective subjects only (`isOptional: true`).

**Response (200) GET:**
```json
{ "students": [{ "id": "", "name": "", "admissionId": "" }], "enrolledIds": [] }
```

**Request PUT:**
```json
{ "studentIds": ["string"] }
```
Full-replace semantics.

**Response (200) PUT:**
```json
{ "studentIds": [] }
```

**Error Responses:**
- `400` — not an array, schedule not found, or schedule isn't marked optional
- `403` — not Admin

---

### GET /api/exams/schedules/{scheduleId}/marks / POST /api/exams/schedules/{scheduleId}/marks

**Authorization:** Signed-in at route layer; real scoping via `assertCanAccessSchedule` — Teacher must be subject teacher or Class Teacher of the schedule's class+section; Admin unrestricted. Once a row leaves `Draft`, a Teacher is locked out until an admin unlocks it (Admin bypasses this lock).

**Response (200) GET:**
```json
{ "schedule": { "maxMarks": 0, "markingType": "Numeric" }, "students": [{ "studentId": "", "marksObtained": null, "status": "Draft" }] }
```

**Request POST:**
```json
{ "rows": [{ "studentId": "string", "marksObtained": "number | null", "attendanceStatus": "Present | Absent | Medical | Exempted | ReExam" }], "submit": "boolean (false = draft save, true = submit for verification)" }
```

**Response (200) POST:** array of saved `ExamMark` rows.

**Error Responses:**
- `400` — empty `rows`, marks out of range, missing values on `submit: true`, editing a locked row, schedule not found, or authorization error
- `401` — not signed in

---

### POST /api/exams/schedules/{scheduleId}/verify

**Authorization:** `requireSchoolAdmin()`.

**Request:**
```json
{ "action": "approve | reject | unlock", "reason": "string (required for reject)", "studentId": "string (optional, narrows to one student)" }
```

**Response (200):** same shape as `GET /api/exams/{id}/verification`, reflecting post-action state.

**Error Responses:**
- `400` — invalid/missing `action`, missing `reason` for reject, or schedule not found
- `403` — not Admin

---

## Results

### GET /api/exams/{id}/results

**Authorization:** `getCurrentUserInfo()`, role-branched in the handler. Parent is forced to `currentUser.studentId` (session-resolved, a `?studentId=` param is ignored for them). Admin gets full access, optionally scoped via `?studentId=`. Any other role (e.g. Teacher) returns `403`.

**Request (query):** `?studentId=<optional, Admin only>`

**Response (200) — Admin, list:**
```json
[{ "id": "", "studentId": "", "totalMarks": 0, "percentage": 0, "grade": "A", "isPass": true, "status": "Draft | Published", "rank": 1, "studentName": "" }]
```
**Response (200) — Parent:** array of 0-1 items, always `status: 'Published'`, includes `subjectWise`:
```json
[{ "id": "", "percentage": 0, "grade": "A", "status": "Published", "subjectWise": [{ "subject": "Math", "marksObtained": 45, "maxMarks": 50, "isAbsent": false }] }]
```

**Error Responses:**
- `401` — not signed in
- `403` — role neither Parent nor Admin
- `404` — Admin requested `?studentId=` with no result row

---

### POST /api/exams/{id}/results

**Authorization:** `requireSchoolAdmin()`. Recomputes every student's `ExamResult` from Approved/Published `ExamMark` rows — a student is skipped (not partially graded) if any applicable schedule lacks an approved mark. Ranks recomputed per class+section using the school's `examRankTieMode`. Upsert-based — idempotent.

**Response (200):**
```json
{ "generated": [{ "id": "", "percentage": 0, "grade": "A", "status": "Draft" }], "skippedStudentIds": [] }
```

**Error Responses:**
- `400` — thrown error (e.g. exam not found)
- `403` — not Admin

---

### GET /api/exams/{id}/results/effective

**Authorization:** `requireSchoolAdmin()`. Reconciles a Re-Test/Improvement exam's own result against its `parentExamId` result per `retakeResultPolicy` (`Best` = higher percentage wins; `Average` = merged; `Latest` = own result always wins). Read-time view only, never writes stored results.

**Request (query):** `?studentId=<required>`

**Response (200):** decorated result shape + `sourceExamId`, or `null`.

**Error Responses:**
- `400` — missing `studentId`, or thrown error
- `403` — not Admin

---

### POST /api/exams/{id}/results/publish / DELETE /api/exams/{id}/results/publish

**Authorization:** `requireSchoolAdmin()`. `POST` flips `Draft` results to `Published` (stamps `publishedAt`) and the corresponding `Approved` marks to `Published` — this is the actual gate that makes results visible to parents. Also sets parent `Exam.status` to `Completed`, audit-logs `ResultPublished`, notifies. `DELETE` reverses it (`unpublishExamResults`).

**Response (200):** same shape as `GET /api/exams/{id}/results` list.

**Error Responses:**
- `400` — thrown error
- `403` — not Admin

---

### GET /api/parent/exams/{id}/result

**Authorization:** `requireParent()`. Uses `actor.studentId` (session-resolved `activeStudentId`) exclusively — no `studentId` param is accepted, so a parent cannot request another child's result.

**Response (200):** single object (or `null`) — same Parent-branch shape as `GET /api/exams/{id}/results`, only populated once `status: 'Published'`.

**Error Responses:**
- `403` — not a Parent

---

### GET /api/print-marksheet/classes / GET /api/print-marksheet

**Authorization:** `getCurrentUserInfo()` (401 if none). For `print-marksheet`, the requested `className`/`sectionName` is checked against the caller's own allowed set (`getPrintableClassSections`) — Teacher limited to `classTeacherOf`, Admin gets everything. Note: this is a blank name-only roster (no marks/admission ID) — not an actual marksheet-with-marks endpoint; there is no dedicated marks-included print route in the codebase (report-card use is served by `GET /api/exams/{id}/results?studentId=`).

**Response (200) classes:**
```json
[{ "className": "", "sectionName": "", "academicSession": "" }]
```
**Response (200) roster (query `?className=&sectionName=`, both required):**
```json
{ "className": "", "sectionName": "", "students": [{ "studentId": "", "name": "" }] }
```

**Error Responses:**
- `401` — not signed in
- `400` — missing query params
- `403` — requested class/section outside caller's allowed set

---

## Finance

`requireSchoolAdmin()` guards every admin route below (403, no separate 401). Parent-owned routes check `getCurrentUserInfo()` directly and compare `actor.studentId` to the URL's studentId.

### Fee Structures

**GET /api/fees/structures** — query `?session=&class=`. Returns `[{ id, academicSession, className, name, terms: { T1: [{ name, amount, required, lateFee }], T2: [], T3: [], T4: [] }, termDates: {}, termTotals: {}, totalAmount, isGenerated }]`.

**POST /api/fees/structures** — body `{ academicSession, className, name?, terms: {...}, termDates: {} }` (at least one item required across all terms, positive amount, non-empty name). Auto-runs `generateStudentFees` for the earliest due term on create (best-effort). Errors: `400` missing fields / invalid terms / duplicate structure for that class+session; `403` not Admin.

**GET/PUT/DELETE /api/fees/structures/{id}** — PUT fully replaces terms/items (delete+recreate, never diffed). Errors: `400` invalid terms; `403` not Admin; `404` not found.

**POST /api/fees/structures/bulk** — body `{ academicSession, classNames: [], name?, terms: {}, termDates: {} }`, creates the same structure per class independently (`Promise.allSettled`). Response: `{ created: [], skipped: [{ className, reason }] }`.

**POST /api/fees/structures/{id}/generate** — body `{ term: "T1" }`. Creates/re-syncs a `StudentFee` for every Active student in that class+session for the term (a `PAID` fee is never touched). Response: `{ generatedCount, updatedCount, skippedCount, totalEligible }`.

---

### Student Fees / Ledger / Discounts

**GET /api/fees/student/{studentId}** — query `?session=`. Any signed-in actor; Parent restricted to own `studentId` (`403` if mismatched, `401` if no session at all). Returns array of `{ id, term, totalAmount, paidAmount, status: PENDING|PARTIAL|PAID, discountType, discountAmount, payableAmount, items: [], payment: {} }`.

**GET /api/fees/student/{studentId}/summary** — same guard. Returns `{ totalFee, paid, due, feeStatus: NO_FEES|DUE|PARTIAL|PAID }`.

**POST/DELETE /api/fees/students/{id}/discount** — Admin only. `[id]` is a `StudentFee` id — a per-fee one-off discount, distinct from the standing discount under `/api/students/{id}/discount`. Body: `{ discountType, discountValue, discountReason? }`. Errors: `400` invalid type/value, fee not found, FIXED exceeds total, or drops payable below already-paid.

**GET /api/fees/students/{id}/ledger** — Parent restricted to own id (`403` on mismatch), but an unauthenticated caller is not rejected with `401` here (only the Parent-role check is enforced). Returns payment history array: `{ id, term, amount, method: CASH|UPI|RAZORPAY|BANK_TRANSFER, status: PENDING|SUCCESS|FAILED, razorpayOrderId, paidAt }`.

**GET /api/fees/students/stats** — Admin only, `force-dynamic`. Returns `{ totalFees, collected, pending, overdue, recoveryPercent }`.

**GET /api/fees/students/summary** — Admin only, `force-dynamic`. Query `?session=&class=&section=&status=&search=&sortBy=paid|due&sortDir=&page=&pageSize=`. Returns `{ rows: [], total, page, pageSize }`.

---

### Collections

**POST /api/fees/collect** — Admin only. Body `{ studentFeeId, method: CASH|UPI|BANK_TRANSFER, amount? (defaults to full remaining due) }` — `RAZORPAY` explicitly rejected here. Errors: `400` missing fields, invalid/RAZORPAY method, fee not found or already PAID, non-positive amount, amount exceeds due.

**POST /api/fees/bulk-collect** — Admin only. Body `{ studentIds: [], method: CASH|UPI|BANK_TRANSFER }` — collects the FULL remaining due (no partial) across all owed terms for each student, one Payment row per StudentFee, single transaction. Response: `{ collectedCount, studentCount, totalCollected }`.

**GET /api/payments** — Admin only. Query `?studentId=&method=&status=&page=&pageSize=`. Returns `{ payments: [], total, page, pageSize }`.

---

### Razorpay Online Payments

**POST /api/payments/razorpay/create-order** — No blanket session guard at the route level, but a resolved Parent actor must own the fee (`fee.studentId === actor.studentId`, else `403`). Body `{ studentFeeId }` — amount is never client-supplied; computed server-side as `payableAmount - paidAmount`. Creates a real Razorpay order and a `PENDING` Payment row. Response: `{ orderId, amount (paise), currency: "INR" }`. Errors: `400` missing field/fee not found/already paid/due below 1 rupee; `401` Razorpay key misconfigured; `403` Parent doesn't own the fee; `500` gateway error; `503` outbound network failure.

**POST /api/payments/razorpay/verify** — Same ownership check. Body `{ studentFeeId, razorpay_order_id, razorpay_payment_id, razorpay_signature }`. Verification: looks up the matching `PENDING` Payment row for that exact `studentFeeId`+`razorpayOrderId` (rejects a valid-but-mismatched order id); computes `HMAC-SHA256(order_id|payment_id, RAZORPAY_KEY_SECRET)` and compares via `crypto.timingSafeEqual`; on mismatch marks the Payment `FAILED` and throws (fee never marked paid); on match, updates Payment to `SUCCESS` and StudentFee `paidAmount`/`status` in one transaction. A duplicate verify call short-circuits with `alreadyProcessed: true` rather than reprocessing. Response: `{ payment: {}, studentFee: {}, alreadyProcessed? }`. Errors: `400` — all thrown verification errors map here, by design ("never a 500"); `403` — Parent doesn't own the fee. No webhook route exists yet.

---

### Cron-Triggered Automatic Fee Generation

**GET /api/cron/generate-fees** — Not a user-session guard: requires `Authorization: Bearer <CRON_SECRET>` matching `process.env.CRON_SECRET` (skipped entirely if that env var is unset — open in that case). Triggered daily by Vercel Cron. For every fee-structure term whose `startDate` has arrived, runs the same generate-or-resync logic as the manual generate endpoint (terms with no `startDate` are never touched by this path). Response: `{ success: true, termsProcessed, results: [{ structureId, className, term, generatedCount, updatedCount, skippedCount, totalEligible }] }`. Errors: `401` — secret mismatch; `500` — generation throws.
