# Phase 1 checklist

Findings refer to `project-audit-findings.csv`. A box is ticked only after the change is made and checked against a running local server (local database).

## Group 1 - Who can do what (permissions)

- [x] **SEC-001** Parent and Accountant could write homework and exam marks
  - Homework create/edit/delete and marks read/write now allow only Teachers (inside their own classes) and Admin / Principal / Super Admin. Marks routes also check the marks permissions first.
- [x] **PRV-001** Parent and Accountant could read any student's full record (Aadhaar, guardians, address)
  - `GET /api/students/[id]` is limited to Admin, Principal, Super Admin. The Accountant's student page now receives a cut-down record (no Aadhaar, address, documents, emergency contacts).
- [x] **SEC-002** Admin-only dashboard pages had no server-side guard
  - Teachers and Accountants are redirected away from Teachers (4 pages), Settings (6 pages) and Promote; Teachers are redirected away from the 3 Fees pages.
- [x] **SEC-005** An Admin could deactivate or re-email a Principal
  - A user can edit another user only if their role could have created that role; status must be Active or Inactive; nobody can change their own status.
- [x] **SEC-006** Parent role could read school-wide data
  - Parents are refused on class attendance rosters, defaulters, payments, fee structures, fee stats/due lists, results list and the print-marksheet class list.
- [x] **API-004** Roles and their permissions are shared by all schools
  - Only the Super Admin can rename a role or change its permissions (API and Roles page).

Checked with 47 requests per role (parent, accountant, teacher, admin, principal): 41 passed on the first run, the other 6 were the page redirects, which come back as HTTP 200 with the redirect inside the response (the page streams). Re-checked by reading the response: Teacher and Accountant get the redirect and none of the page content; Admin gets the page.

Notes
- The Parent role still holds its read permissions in the database; the routes above now refuse Parents on their own, so no database change was needed.
- A temporary Principal user was created for the tests and removed again. The "edit an accountant" checks wrote the same values back.

## Group 2 - Online payment

- [x] **BIZ-002 / FE-001 / OBS-007 / ARC-002** No webhook; payment depended on the browser coming back
  - New `POST /api/payments/razorpay/webhook`: checks Razorpay's signature on the raw body, handles `payment.captured` / `order.paid`, ignores everything else, refuses all calls when `RAZORPAY_WEBHOOK_SECRET` is not set.
  - New nightly job `GET /api/cron/reconcile-payments` (in `vercel.json`): asks Razorpay about payments still pending after 30 minutes and records the captured ones.
- [x] **BIZ-003 / DB-002** Two payments at once could double-collect or overpay
  - Manual, bulk and online payments now run in one transaction on a locked fee row, so the second payment sees the first. A manual amount can never exceed the remaining due; an online payment that arrives after the fee was already paid is recorded but only the remaining due is credited (the difference is logged as a refund needed). Opening checkout twice within 30 minutes reuses the open order.

Checked (production build, local DB): two cashiers collecting the same fee together gave one success and one refusal; two 60% collections together never exceeded the fee; webhook without or with a wrong signature refused; a valid event credited the fee once; a replay changed nothing; three simultaneous deliveries credited once; wrong amount, unknown order and other event types ignored.
Not checked: a real Razorpay call (no live keys here), so the order-reuse and the reconcile fetch were not exercised against Razorpay.

## Group 3 - Aadhaar and documents

- [x] **ARC-001 / PRV-002** Documents under public, guessable links
  - Document keys now contain a random id. With `R2_PRIVATE_BUCKET_NAME` set, new student/teacher documents go to that private bucket and are opened only through `/api/documents/file`, which allows Admin / Principal / Super Admin of the same school and redirects to a link that expires in 5 minutes.
  - Not done by code: creating the private bucket and moving documents that are already stored in the public bucket.
- [x] **PRV-003** Aadhaar, PAN and bank account numbers stored in plain text
  - Encrypted with the same key as the payment secrets for students (and their guardians) and teachers (and their parents/guardian, bank account number). `scripts/encrypt-sensitive-fields.cjs` converts older rows; run on the local database (2 students, 3 teachers), safe to run twice.
- API-007 (upload size) was left out on request.

Checked: random key, private bucket used, links refused without login / for parent / for teacher / for another school, allowed for the same school and the Super Admin; values encrypted in the database and shown normally in the app; a save round-trip stores them encrypted and reads them back (row restored afterwards).

## Group 4 - Login and session

- [x] **SEC-003** Deactivated users kept access until the token expired
  - Deactivated admin / principal / accountant, disabled or suspended teacher, parent of a removed account, or a suspended school is signed out within about 20 seconds; their pages send them through `/api/auth/session-ended`, which clears the cookie.
- [x] **DB-003** Same email in more than one school
  - Teacher, parent and principal/accountant logins check every account with that email and accept only when exactly one matches the password; if two do, it refuses with a clear message.
- [x] **API-008** Login limit reset on every restart
  - Attempt counters are now in the database (table `RateLimitCounter`), with an in-memory fallback if the database is unreachable. Checked: the 9th failed try is refused and still refused after the server was restarted.

Found and fixed during testing: a signed-out teacher's dashboard returned an error page instead of redirecting (layout now checks the session first).
Checked: 51 checks across groups 2 to 4 pass on the production build.

## Needs you (not possible from here)

- Vercel: set `CRON_SECRET` and `RAZORPAY_WEBHOOK_SECRET`; add the webhook in the Razorpay dashboard (URL `/api/payments/razorpay/webhook`, events `payment.captured`, `order.paid`).
- Cloudflare: create a private bucket and set `R2_PRIVATE_BUCKET_NAME`; decide how to move already-stored documents.
- Sydney database: create the `RateLimitCounter` table and run `scripts/encrypt-sensitive-fields.cjs --apply`. Until the table exists the login limit falls back to memory.
- Your running dev server on port 3000 still showed the old session behaviour in my last check; restart it so it picks up all changes.

## Small fixes batch (BIZ-004, API-005, SEC-007)

- [x] **BIZ-004** (input part) Attendance saved whatever the browser sent
  - `markedBy` is now the signed-in user's own name; every row must be a student of that class and section, appear once, and have a real status (Present / Absent / Leave); remarks are cut to 200 characters; the date must be a real date.
  - **Not changed, your decision:** the Teacher deadline / edit-window rules are switched off by a flag in `lib/attendance.js` (`ATTENDANCE_LOCK_ENABLED = false`, with a comment saying "temporarily off"). Turning it on would stop Teachers marking past dates or after the cut-off time, so it is a product choice, not a bug fix. Say the word and it is a one-line change.
- [x] **API-005** (partly) A broken request body returned a server error
  - A missing or malformed JSON body now answers 400 instead of 500 on every API route (109 route files, one shared helper `lib/http.js`).
  - Fee collection, bulk collection and fee reminders now check amount and id types and sizes (amount must be a whole number above zero, at most 500 students per bulk collection, 2000 per reminder).
  - **Not done:** a full field-by-field validation of every create/update route (students, teachers, exams, notices, ...). The existing form schemas in `lib/schemas.js` could be reused route by route; that is a larger job and is still open.
- [x] **SEC-007** No security headers, API open to every website
  - Every response now carries: no content-type guessing, no framing by other sites, trimmed Referer, camera/microphone off (location kept for staff check-in), and HSTS in production.
  - CORS: set `CORS_ALLOWED_ORIGINS` (comma-separated) in Vercel to restrict browser access to your own sites. Left unset it stays open as before, so Expo Web keeps working until you choose.
  - **Not done:** a full Content-Security-Policy for scripts and styles (it needs testing against Razorpay checkout, fonts and Pusher first); only the framing part of it is on.

Checked on a production build: 27 new checks pass (broken bodies on 8 routes, 5 money-route checks, 7 attendance checks, 6 header checks and CORS). The earlier permission and Phase 0 suites were re-run and pass; the only differences were the test accounts (a teacher with login disabled is now correctly refused) and page redirects, which the app answers with HTTP 200 plus a redirect inside the page.

## MOB-001 and SEC-014 - demo passwords

- [x] **MOB-001** Mobile login screen showed demo teacher and parent passwords
  - The "Test credentials" box now exists only in a development build and only when `EXPO_PUBLIC_DEMO_PASSWORD` is set in your local `.env`; the passwords are no longer written in the file. A release build never shows it. (Mobile repo: `src/features/auth/LoginScreen.js`.)
- [x] **SEC-014** Passwords written in the source code
  - Removed from the Super Admin comment (`lib/auth.js`), the school-admin and demo-parent seed (`prisma/seed.js`) and the demo-teacher seed (`lib/teacherSeedData.js`). The seed now uses `SEED_DEMO_PASSWORD` (or generates a random one and prints it once).
  - Still mentioned in older documents (`SKILL.md`, `AUDIT_REPORT.md`) and in git history: those cannot be un-published by a code change, which is why the accounts below matter.

### Found while checking: accounts on the Sydney database still use those passwords
Read-only check of the Sydney database against the passwords that were written in the repository (nothing printed or changed):
- Super Admin and both school admins: **not** using them (good).
- **9 teacher logins** (login on) and **2 parent accounts**, plus the matching 11 internal user rows, **are** using them. Mostly test-looking addresses (`*.test@school.com`, `demo.parent@schoolapp360.local`), but also `alpha1@gmail.com`, `sara.rais.9a@school.com` and one teacher with no email.
- Anyone who has seen the repository or the old mobile screen can sign in to these. **Open: decision needed** (disable login, or reset the passwords).
