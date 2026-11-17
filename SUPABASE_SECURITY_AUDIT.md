# SchoolApp360 — Supabase Security & RLS Audit

Scope: audit only. No code, database, policy or configuration was changed. No live Supabase database was queried. Secret values are never printed; only variable names and locations are named.

How to read this report:

- **CONFIRMED** = read directly from the source code or files in this repository.
- **UNVERIFIED** = depends on the live Supabase project (dashboard settings, actual table state, grants). Section 14 lists the exact queries that settle each one.

---

## 1. Executive Summary

SchoolApp360 does **not** use Supabase as a backend platform. It uses Supabase only as a **hosted PostgreSQL server**. All data access goes through Prisma, from the Next.js server, over `DATABASE_URL` (the Supabase connection pooler). There is no `@supabase/*` package, no Supabase client, no Supabase Auth, no Supabase Storage and no Edge Function anywhere in the admin panel or the mobile app (CONFIRMED by searching both repositories).

Two consequences decide the whole audit:

1. **RLS is not the security boundary of this application, and cannot be.** The Prisma connection logs in as a privileged database role. On Supabase the default `postgres` role has `BYPASSRLS`, so any RLS policy would be skipped by the application itself. Tenant isolation today is 100% application code (`schoolId` filters in every Prisma query, plus permission checks).
2. **RLS still matters for a different reason: Supabase's auto-generated Data API (PostgREST/GraphQL).** Every table in the `public` schema that Prisma creates has RLS **off** unless someone turned it on, and Supabase's default privileges grant `anon` and `authenticated` access to new public tables. If the project's Data API is enabled (it is by default), anyone who knows the project URL and the public anon key could read and write every table directly, bypassing the whole application. No RLS statement exists anywhere in this repository (CONFIRMED), so unless it was done by hand in the dashboard, this is the single most important item to verify (finding F1).

The application layer itself is in reasonable shape after the earlier hardening rounds: sessions are signed, HttpOnly, revalidated against the database, tenant comes from the session (never the request), every one of the 190 API routes authenticates before doing anything, except the ones that are public by nature (the login routes, `session-ended`, and two sample-spreadsheet downloads). The remaining risks are structural: no database-level defence in depth, a single signing secret, and a few intra-school authorization gaps.

Counts: 55 Prisma models/tables, 41 carry a `schoolId` column, 14 do not (children of a tenant table, global RBAC tables, or the tenant table itself).

---

## 2. Existing Architecture Overview

| Item | Finding | Evidence |
|---|---|---|
| Frontend / backend framework | Next.js 16.4.1 (App Router, Turbopack), React 19.2.8, one codebase for pages and `/api` routes | `package.json` |
| Database access | Prisma 6.19.3 to PostgreSQL. `DATABASE_URL` only; no `directUrl` | `prisma/schema.prisma` lines 18-21 |
| Supabase integration | Hosted Postgres only. Pooler host `aws-0-ap-southeast-2.pooler.supabase.com:6543` appears in `.env.production` and as a commented line in `.env` | `.env`, `.env.production` |
| Supabase client libraries | None | grep over both repos |
| Authentication | Custom JWT (jose, HS256), 7 day expiry, signed with `JWT_SECRET` | `lib/auth/jwt.js` |
| Session carrier | HttpOnly cookie `schoolapp360_session` for web; `Authorization: Bearer` for the mobile app | `lib/auth/session.js` |
| Password storage | bcryptjs hashes (`passwordHash` columns) | `prisma/schema.prisma` |
| Authorization | Server-side only: `requirePermission`, `requireStaffPermission`, `isAdminTier`, class-scope helpers, page guards | `lib/rbac.js`, `lib/roleGuard.js`, `lib/iam.js` |
| Tenant resolution | Taken from the session claim (`resolveSchoolId`), never from the request body | `lib/auth/schoolContext.js` |
| File storage | Cloudflare R2 (S3 API), not Supabase Storage | `lib/storage.js` |
| Realtime | Pusher Channels (support chat) | `lib/pusher.js`, `lib/pusherClient.js` |
| Payments | Razorpay; per-school secret stored AES-256-GCM encrypted | `lib/razorpay.js`, `School.razorpayKeySecretCipher` |
| Field encryption | `enc1:` AES-GCM with `ENCRYPTION_KEY` for Aadhaar and guardian identity fields | `lib/fieldCrypto.js` |
| Raw SQL | about a dozen call sites, all parameterised except one (see F10) | grep for `$queryRaw`/`$executeRaw` |

Supabase anon key / service_role key: **neither appears anywhere in the repositories** (CONFIRMED). They exist only inside the Supabase project dashboard. Their existence is by design; what matters is what they can reach (F1).

Relevant files: `lib/db.js`, `lib/auth/jwt.js`, `lib/auth/session.js`, `lib/auth/sessionStatus.js`, `lib/auth/schoolContext.js`, `lib/auth/loginRateLimit.js`, `lib/iam.js`, `lib/rbac.js`, `lib/roleGuard.js`, `middleware.js`, `next.config.mjs`, `app/actions/auth.js`, `app/api/auth/*/login/route.js`.

---

## 3. Authentication Flow

| Actor | Login path | Token returned |
|---|---|---|
| Super Admin | Server action in `app/actions/auth.js`, `/super-admin` login form | cookie |
| School Admin | Server action in `app/actions/auth.js` | cookie |
| Staff (Principal, Admin, Accountant) | `app/api/auth/staff/login/route.js` (mobile) and the web action | cookie or Bearer |
| Teacher | `app/api/auth/teacher/login/route.js` and web action | cookie or Bearer |
| Parent | `app/api/auth/parent/login/route.js` and web action; `parent/switch` issues a new token for a sibling | cookie or Bearer |
| Student | **No student login exists** (`Student.portalPasswordHash` is a schema field only; no route uses it) | n/a |

CONFIRMED behaviours:

- Login is rate limited in the database (`RateLimitCounter`, per IP and per email), so it works across serverless instances.
- The token payload carries `role`, `id`, `schoolId`, and for staff `roleKey`/`userId`. It is signed, so a client cannot change it without `JWT_SECRET`.
- Every request re-checks that the account is still active and the school is `Active` (`lib/auth/sessionStatus.js`, cached 20 seconds). A disabled teacher or suspended school is signed out within seconds.
- Cookie flags: `httpOnly: true`, `secure` in production, `sameSite: 'lax'`.
- Permissions are re-read from the database per request for RBAC users, not trusted from the token.
- CORS is opt-in through `CORS_ALLOWED_ORIGINS` (`middleware.js`).

---

## 4. Complete Database Table Inventory

"Sensitive" means personal, financial, credential or academic-record data. "RLS enabled" and "Policies" are **UNVERIFIED** for every row: no RLS SQL or policy exists in this repository (`prisma/migrations` holds one init migration covering 2 of 55 models, with no RLS statements), and the live database was not queried. Tables created by Prisma `db push` have RLS off by default.

| Table (Prisma model) | Sensitive data | `schoolId` | RLS enabled | Policies found |
|---|---|---|---|---|
| SuperAdmin | credentials (`passwordHash`) | no (platform level) | unverified | none in repo |
| Role, Permission, RolePermission | RBAC catalogue, not personal | no (global by design) | unverified | none in repo |
| School | contact details, per-school Razorpay key id, encrypted key secret | is the tenant table | unverified | none in repo |
| User | staff credentials, email, role | yes | unverified | none in repo |
| SchoolAdmin | credentials, email | yes | unverified | none in repo |
| ParentAccount | parent name, phone, email, `passwordHash` | yes | unverified | none in repo |
| ParentStudentLink | which parent can see which child | no (child of ParentAccount/Student) | unverified | none in repo |
| Student | name, DOB, gender, blood group, address, guardian JSON, Aadhaar (encrypted), document URLs, fee details | yes | unverified | none in repo |
| StudentEnrollment, StudentPromotionLog | placement and promotion history | yes | unverified | none in repo |
| Teacher | name, DOB, Aadhaar, PAN, bank details JSON, login email, `passwordHash` | yes | unverified | none in repo |
| TeacherLeave, TeacherAttendance | HR records | yes | unverified | none in repo |
| Class, Section, Subject, TimeTable, AcademicSession, GradeScale | school structure | yes | unverified | none in repo |
| Attendance | per-student daily attendance (JSON records) | yes | unverified | none in repo |
| CalendarEvent, Notice, Homework | school communication | yes | unverified | none in repo |
| FeeStructure | fee amounts | yes | unverified | none in repo |
| FeeStructureTerm, FeeStructureItem | fee amounts | no (child of FeeStructure) | unverified | none in repo |
| StudentFee | what each student owes and has paid | yes | unverified | none in repo |
| StudentFeeItem | line items | no (child of StudentFee) | unverified | none in repo |
| Payment | amounts, Razorpay ids, collector, receipt number | yes | unverified | none in repo |
| ReceiptCounter | per-school receipt counter | yes (it is the key) | unverified | none in repo |
| FeeAuditLog | who collected, reversed, discounted | yes | unverified | none in repo |
| Exam, ExamSchedule, ExamOptionalEnrollment | exam setup | yes | unverified | none in repo |
| ExamMark, ExamResult | student marks and results | yes | unverified | none in repo |
| ExamAuditLog | exam action trail | yes | unverified | none in repo |
| SubjectTest | test setup | yes | unverified | none in repo |
| SubjectTestMark | student marks | no (child of SubjectTest) | unverified | none in repo |
| MonthlyReport, YearlyReport | student performance reports | yes | unverified | none in repo |
| MonthlyReportActivity, MonthlyReportHolistic, MonthlyReportRemark | teacher remarks about students | no (child of MonthlyReport) | unverified | none in repo |
| ReportLock, GeneratedReportJob | report lock audit, jobs | yes | unverified | none in repo |
| PushToken | device push tokens | yes | unverified | none in repo |
| ParentNotification, TeacherNotification, AdminNotification | personal notifications | yes | unverified | none in repo |
| SupportTicket | school support messages | yes | unverified | none in repo |
| SupportTicketReply | support messages | no (child of SupportTicket) | unverified | none in repo |
| RateLimitCounter | hashed login keys and counters | no | unverified | none in repo |

---

## 5. RLS Status

**Verified state: unknown.** No live database access was available (the only Supabase connection string is in `.env.production` and a commented line in `.env`; connecting to production was outside the scope of an audit-only task).

**What the repository proves:**

- No `ENABLE ROW LEVEL SECURITY`, `CREATE POLICY`, `FORCE ROW LEVEL SECURITY`, `GRANT`/`REVOKE` or `SECURITY DEFINER` statement exists in any SQL, Prisma or application file.
- The Prisma schema cannot express RLS, so `db push` and `migrate` never create it.
- The only migration is `20260830172048_init` (38 lines, 2 models). The production schema was therefore built with `db push` or by hand, and any RLS present would have to have been added manually.
- No database functions, views, RPC functions, Edge Functions or Storage buckets are defined in the repository.

Items 1-12 of the requested per-table checklist (SELECT/INSERT/UPDATE/DELETE policies, role-specific, school validation, `USING (true)`, cross-tenant) therefore cannot be answered from source. They are answered by running the catalog queries in section 14.

---

## 6. Findings

### F1. RLS probably disabled on every public table while the Data API may be reachable — CRITICAL (UNVERIFIED, probable)

- **Affected:** all 55 tables in the `public` schema.
- **File:** none (absence of any RLS SQL in the repo).
- **Explanation:** Supabase exposes the `public` schema through PostgREST at `https://<project>.supabase.co/rest/v1/<table>`. The anon key is a public value by design (it is shipped in every Supabase front end and visible in the dashboard). Access control for that API is RLS. Prisma-created tables have RLS off, and Supabase's default privileges give `anon` and `authenticated` table rights.
- **Impact:** if the Data API is on and RLS is off, anyone with the project URL and anon key can read every student, parent, teacher, fee, payment and result, and can insert, update or delete rows, without touching the application and without any log in the app.
- **Fix:** enable RLS on every public table with no policies (deny-all for `anon`/`authenticated`), revoke the default grants, and/or turn off the Data API for this project. The Prisma connection is unaffected because its role bypasses RLS. SQL is in section 11. Verify first with the queries in section 14.

### F2. The application's database role bypasses RLS, so there is no database-level defence in depth — HIGH (CONFIRMED architecture)

- **Affected:** all tables; `lib/db.js`, every `lib/*.js` data module.
- **Explanation:** one pooled role runs every query for every school. Cross-school isolation exists only because each query adds `schoolId` correctly.
- **Impact:** any single missed `schoolId` filter, in any of roughly 190 routes and dozens of lib modules, is a cross-school leak and nothing underneath would stop it. Earlier audits already found and fixed several of this kind (session-less requests acting as a Teacher, unauthenticated school creation, payment and document gaps).
- **Fix:** keep the application checks, and add a database backstop (section 10, option B) when the team can invest in it. Short term, add an automated cross-tenant test that logs in as school A and requests school B ids on every route.

### F3. Tenant filtering is per-query and not centrally enforced; 14 tables have no `schoolId` — MEDIUM (CONFIRMED)

- **Affected:** the child tables listed in section 4 as "no (child of ...)", plus global RBAC tables; for example `lib/classes.js` (`prisma.section.findFirst({ where: { id: sectionId, classId } })`, safe only because the parent class was checked with `schoolId` first), `lib/fees.js` item operations.
- **Explanation:** isolation for child tables depends on the parent lookup having been scoped. A future code path that touches a child by id alone would leak.
- **Impact:** latent cross-school read or write if a route forgets the parent check.
- **Fix:** add `schoolId` (with an index) to child tables over time, or use composite foreign keys `(schoolId, parentId)`; centralise scoping in a Prisma client extension that injects `schoolId`.

### F4. Single signing secret with 7 day tokens; role and school claims are trusted from the token — HIGH (CONFIRMED design, secret strength UNVERIFIED)

- **Affected:** `lib/auth/jwt.js`, `JWT_SECRET`.
- **Explanation:** HS256 with one secret. Anyone who obtains `JWT_SECRET` can mint a token for any role and any `schoolId`, including `SuperAdmin`, with no database record needed beyond a matching id for the status check (a Super Admin token needs a real `SuperAdmin.id`).
- **Impact:** total compromise of every school. There is no key rotation, no `kid`, no per-token revocation list; a stolen valid token works until expiry unless the account is disabled.
- **Fix:** use a long random secret (32+ bytes) that is different per environment and stored only in the host's secret store; document the rotation procedure; consider shorter expiry with refresh for the mobile app.

### F5. Session validity check fails open — MEDIUM (CONFIRMED)

- **File:** `lib/auth/sessionStatus.js`.
- **Explanation:** if the status query throws (database error), the function returns `true` and the session is accepted. Roles not listed in the check (anything other than SuperAdmin, SchoolAdmin, Teacher, Parent) also return `true`.
- **Impact:** during a database fault, disabled accounts keep working until the fault clears; low likelihood, moderate effect.
- **Fix:** fail closed for write routes (or for any route) when the check cannot run; list every known role explicitly.

### F6. Teacher and staff attendance data readable beyond their own class — MEDIUM (CONFIRMED, within one school)

- **File:** `app/api/attendance/student/[id]/route.js`.
- **Explanation:** a Parent is restricted to their own child, but any other role holding an attendance permission can request any student id of the school. A Teacher is not limited to students of their own classes.
- **Impact:** intra-school over-exposure of attendance records. Not cross-school.
- **Fix:** for a Teacher, require `isStudentInTeacherScope`; mirror the check used by `app/api/students/[id]/profile/route.js`.

### F7. Identity data encryption depends on a one-off migration and on `ENCRYPTION_KEY` — MEDIUM (partly UNVERIFIED)

- **Files:** `lib/fieldCrypto.js`, `scripts/encrypt-sensitive-fields.cjs`.
- **Explanation:** new Aadhaar and guardian identity values are encrypted on write. Existing rows are plaintext until the script is run with `--apply`, and it was intentionally not run against the Sydney database yet. If `ENCRYPTION_KEY` differs between environments or is lost, data becomes unreadable.
- **Impact:** until the script runs, stored Aadhaar values on production are readable by anyone who can read the table (see F1). Bank details JSON and PAN on `Teacher` are not covered by field encryption.
- **Fix:** run the encryption script on production after confirming the key; extend encryption to PAN and bank details.

### F8. Documents may be stored in the public R2 bucket — MEDIUM (UNVERIFIED)

- **File:** `lib/storage.js`, `app/api/*/document-upload-url/route.js`, `app/api/documents/file/route.js`.
- **Explanation:** identity documents go to a private bucket only when `R2_PRIVATE_BUCKET_NAME` is set; with it unset they land in the public bucket served from `cdn.schoolapp360.com`. Logos and photos are intentionally public.
- **Impact:** public URLs to Aadhaar scans if the private bucket was never configured.
- **Fix:** create the private bucket, set the variable, and move existing documents.

### F9. Production database URL stored in project files on a developer machine — LOW (CONFIRMED)

- **Files:** `.env.production` (contains the production `DATABASE_URL`), `.env` (commented production line). Both are matched by `.gitignore` (`.env*`) and are not tracked by git (CONFIRMED), so they are not in the repository history.
- **Impact:** a laptop compromise or an accidental copy exposes production database access. The mobile project also keeps a Firebase Admin SDK key file and a keystore backup in its project folder; both are gitignored, but they are sensitive files in a working directory.
- **Fix:** keep production secrets only in the hosting provider's secret store; remove the files from disk; rotate the database password if they were ever shared.

### F10. One raw SQL statement interpolates an identifier — LOW (CONFIRMED)

- **File:** `lib/support.js` line 109: `$executeRawUnsafe(\`UPDATE "SupportTickets" SET "${column}" = NOW() WHERE id = $1\`, ...)`.
- **Explanation:** `column` is chosen from two literals by the function, never from input, so it is not injectable today.
- **Fix:** replace with two explicit `$executeRaw` tagged statements so a later edit cannot introduce injection.

### F11. `/setup` page reachable without sign-in — LOW (CONFIRMED earlier, API guarded)

- **File:** `app/setup`.
- **Explanation:** the page renders for anyone; the API it calls requires a Super Admin. No data is exposed, but the page should not be public.
- **Fix:** guard the page like the other Super Admin pages.

### F12. Connection pooling and role privileges not constrained — LOW (UNVERIFIED)

- **Explanation:** the app uses the pooler on port 6543 (transaction mode) with no `connection_limit` and no `directUrl`. The role in the connection string is not known; if it is the `postgres` owner, it also has rights to alter or drop tables.
- **Fix:** run the app as a dedicated least-privilege role (DML only on its tables, no DDL) and use a separate role for migrations.

### Confirmed good practices

- Tenant id comes from the signed session, not the request (`resolveSchoolId`); a request with no session throws.
- Every API route authenticates, except the login routes, `session-ended` and the static sample spreadsheet routes (`students/bulk-import/template`, `blank-template`). Found by a source scan for an auth helper in each `route.js`; it proves the call is present, not that each check is correct.
- Cron endpoints require `CRON_SECRET` and fail closed; the Razorpay webhook verifies an HMAC.
- Payments are finalised under row locks with unique Razorpay ids.
- Login throttling is stored in the database.
- Security headers are set in `next.config.mjs`.
- Parent endpoints use `requireParent()` and take the child from the session.

---

## 7. Multi-Tenant Isolation Analysis

| Expected rule | Current state | Basis |
|---|---|---|
| School Admin A sees only School A | Enforced in application code via the `schoolId` claim and per-query filters | CONFIRMED in code; no database enforcement |
| Teachers see only their school and authorised academic records | School isolation yes; class scoping implemented for Students, Homework, Notices, Exams, Marks; gap in attendance-by-student (F6) | CONFIRMED |
| Parents see only linked children | Yes: `requireParent()` resolves the child from the session and `ParentStudentLink`; attendance route checks `actor.studentId === id` | CONFIRMED |
| Students see only own records | Not applicable: there is no student login | CONFIRMED |
| Accountants see authorised financial data | RBAC `fees.*` keys; Accountant is also restricted to a reduced student record on the student page | CONFIRMED |
| Super Admin accesses multiple schools by explicit permission | One Super Admin; "manage a school" stores the chosen `schoolId` in the Super Admin's own session; without it the code falls back to the seed id `school-1` | CONFIRMED (`lib/auth/schoolContext.js`, `lib/school.js`) |
| School id never trusted from the frontend | True for session-based routes; no route reads a client-supplied `schoolId` for scoping | CONFIRMED by review of the tenant helpers; not an exhaustive per-route proof |
| Database-level isolation | None | CONFIRMED absence |

Possible cross-school leakage paths, all application-level: a route that queries a child table by id alone (F3); a new route that forgets `resolveSchoolId()`; any bypass of the Data API if RLS is off (F1, direct and unauthenticated).

---

## 8. Authentication & Authorization Findings

- Role cannot be manipulated from the frontend: the role lives inside a signed token. It can be forged only with `JWT_SECRET` (F4).
- Server routes validate independently: yes, each API route authenticates and checks permission or role; unauthenticated callers get 401.
- User id and school id are not blindly trusted: the status check reads the account and school from the database (F5 notes its fail-open case).
- Privilege escalation review: Admin-tier checks use an allow-list (`isAdminTier`); user and role management routes require Admin-tier and refuse editing Super Admin or higher roles; no route accepts a client-supplied role for sessions.
- Cookie flags are correct (HttpOnly, Secure in production, SameSite=Lax).
- Missing: token revocation list, rotation, MFA, and a student identity.

---

## 9. Supabase API & Secret Security

| Variable (name only) | Where used | Exposure |
|---|---|---|
| `DATABASE_URL` | server only (`prisma/schema.prisma`, `lib/db.js`) | not exposed to the browser; stored in `.env` / `.env.production` on disk (F9) |
| `JWT_SECRET` | server only (`lib/auth/jwt.js`) | not exposed |
| `ENCRYPTION_KEY` | server only (`lib/fieldCrypto.js`) | not exposed |
| `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER`, `NEXT_PUBLIC_APP_URL` | browser | public by design |
| `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER` | server only | not exposed |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`, `R2_PRIVATE_BUCKET_NAME` | server only (`lib/storage.js`) | not exposed; the public bucket is intentionally readable |
| `SMTP_*` | server only | not exposed |
| `RAZORPAY_WEBHOOK_SECRET`, `CRON_SECRET` | server only | must be set in the host; not present in local `.env` |
| Supabase `anon`/publishable key | **not referenced anywhere** | exists in the Supabase dashboard; its reach is decided by F1 |
| Supabase `service_role` key | **not referenced anywhere** | CONFIRMED not in either repository |

Server-side vs browser-side clients: there is no Supabase client of either kind. Edge Functions, RPC functions, database functions, views and Supabase Storage policies: none defined in the repository (live database not checked).

---

## 10. Recommended RLS Architecture

**Can the existing custom JWT work with Supabase RLS?** Not directly. `auth.uid()` and `auth.jwt()` read the JWT that PostgREST validated with the **Supabase project JWT secret**. This application signs its own tokens with `JWT_SECRET`, and its Prisma connection does not carry a user JWT at all. So `auth.uid()` would always be null and must not be used as the application user.

Recommended approach, in order:

**A. Now (closes F1): deny-all for the Data API.**
Enable RLS on every public table and add no policies. `anon` and `authenticated` then get zero rows. Revoke their grants as well. Prisma keeps working because its role bypasses RLS. This turns the database into "application access only" without changing any application code.

**B. Later (closes F2): database-enforced tenant isolation using a session variable.**
1. Create a dedicated application role that does **not** have `BYPASSRLS` and does not own the tables.
2. On every request, inside a transaction, run `SELECT set_config('app.school_id', $1, true)` and `set_config('app.role', $2, true)` (transaction-local, so it is safe with the transaction-mode pooler).
3. Add policies such as `USING ("schoolId" = current_setting('app.school_id', true))` and the same in `WITH CHECK` for each tenant table; Super Admin access through an explicit `app.role = 'SuperAdmin'` branch.
4. Wrap Prisma with a client extension so every query runs in that transaction. This is a significant change and needs full regression testing.
5. Add `schoolId` to the 14 tables without it first (F3), or write the child policies with `EXISTS` against the parent.

**C. Not recommended:** minting Supabase-compatible JWTs and using `auth.uid()`. It only makes sense if browsers will call Supabase directly, which this application never does.

Policy patterns for option B, per operation:

- SELECT: `USING (school_matches AND role_allows)`.
- INSERT: `WITH CHECK ("schoolId" = current_setting('app.school_id', true))` so a row can never be written into another school.
- UPDATE: both `USING` and `WITH CHECK` on the same school match (blocks moving a row to another school).
- DELETE: `USING` school match, and only for Admin-tier roles on the tables where deletion is allowed.
- Parent access to a child: `EXISTS (SELECT 1 FROM "ParentStudentLink" l WHERE l."parentAccountId" = current_setting('app.user_id', true) AND l."studentId" = "Student".id)`.
- Teacher class scope stays in the application (too dynamic for simple policies); the database only guarantees the school.

---

## 11. Suggested SQL Migration Examples

These are **examples only and were not run**. Test on a copy first.

```sql
-- A1. Deny-all for the Data API: enable RLS on every public table, no policies.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;
-- Do NOT use FORCE ROW LEVEL SECURITY unless the application role is a non-owner,
-- non-BYPASSRLS role; FORCE applies RLS to the table owner too.

-- A2. Remove the default Data API grants.
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

-- A3. Tables created later by `prisma db push` are not covered by A1. Re-run A1 after
-- every schema change, or add an event trigger that enables RLS on CREATE TABLE.
```

```sql
-- B. Example of a tenant policy for option B (session variable). One table shown.
CREATE ROLE schoolapp_app LOGIN PASSWORD '<set-outside-this-file>' NOBYPASSRLS;
GRANT USAGE ON SCHEMA public TO schoolapp_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Student" TO schoolapp_app;

CREATE POLICY student_school_isolation ON "Student"
  AS PERMISSIVE FOR ALL TO schoolapp_app
  USING      ("schoolId" = current_setting('app.school_id', true))
  WITH CHECK ("schoolId" = current_setting('app.school_id', true));
```

The application would then run each request as `BEGIN; SELECT set_config('app.school_id', '<id from the session>', true); ...queries...; COMMIT;`.

---

## 12. Priority-Based Remediation Roadmap

| Priority | Action | Closes |
|---|---|---|
| 1 (today) | Run the verification queries in section 14 against the live project. If any table has RLS off and the Data API is on, apply A1 and A2, or disable the Data API in the Supabase dashboard | F1 |
| 1 (today) | Confirm `JWT_SECRET` is long, random, different per environment and not shared | F4 |
| 2 (this week) | Run the Aadhaar/guardian encryption script on production after confirming `ENCRYPTION_KEY`; create the private R2 bucket and set `R2_PRIVATE_BUCKET_NAME` | F7, F8 |
| 2 | Remove `.env.production` and the commented production URL from the laptop; keep production secrets only in the host; rotate the database password | F9 |
| 3 | Teacher scope on attendance-by-student; guard `/setup`; fail-closed session check | F6, F11, F5 |
| 3 | Dedicated least-privilege database role for the app; separate migration role | F12 |
| 4 (planned) | Add `schoolId` to child tables; cross-tenant automated test suite | F3, F2 |
| 5 (planned) | Option B: session-variable RLS with a non-bypass role and a Prisma extension | F2 |
| 5 | Replace the one `$executeRawUnsafe` | F10 |

---

## 13. Files That Need Changes

| File | Change |
|---|---|
| `prisma/` (new `manual/` SQL, or a real migration) | Add RLS enable and revoke statements; keep them idempotent and re-run after schema pushes |
| `lib/auth/sessionStatus.js` | Fail closed; list all roles explicitly (F5) |
| `app/api/attendance/student/[id]/route.js` | Teacher class scope (F6) |
| `app/setup/page.jsx` | Require Super Admin (F11) |
| `lib/support.js` (line 109) | Replace `$executeRawUnsafe` (F10) |
| `lib/fieldCrypto.js`, `lib/teachers.js` | Encrypt PAN and bank details (F7) |
| `lib/storage.js` | Refuse to store identity documents in the public bucket when the private bucket is not configured (F8) |
| `lib/db.js` | Later: Prisma extension that injects `schoolId` and sets the session variable (option B) |
| `prisma/schema.prisma` | Later: `schoolId` on child tables; `directUrl` for migrations (F3, F12) |
| `.env.production`, `.env` | Remove from disk; use the host's secret store (F9) |

---

## 14. Questions and Missing Information Needing Live Database Verification

Run these in the Supabase SQL editor (read-only). They answer everything this report marks UNVERIFIED.

```sql
-- 1. Is RLS enabled on each table, and is it forced?
SELECT c.relname AS table, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY c.relrowsecurity, c.relname;

-- 2. Every policy that exists.
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;

-- 3. What can anon and authenticated do on public tables?
SELECT grantee, table_name, string_agg(privilege_type, ', ') AS privileges
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated')
GROUP BY grantee, table_name ORDER BY table_name;

-- 4. Which role does the application connect as, and can it bypass RLS?
SELECT rolname, rolsuper, rolbypassrls, rolcanlogin FROM pg_roles ORDER BY rolname;

-- 5. Functions and views exposed in public (SECURITY DEFINER, RPC).
SELECT p.proname, p.prosecdef AS security_definer
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public';
SELECT table_name FROM information_schema.views WHERE table_schema = 'public';

-- 6. Storage buckets, if the Storage feature is on.
SELECT id, name, public FROM storage.buckets;
```

Dashboard checks:

- Project Settings, API: is the **Data API** enabled, and which schemas are exposed (`public`)? Which keys exist (anon, service_role) and have they been shared or used anywhere?
- Authentication: is anything enabled that creates `auth.users` (not used by the app, but sign-ups should be off).
- Database, Roles: the exact role named in the production `DATABASE_URL`.
- Hosting provider (Vercel) environment: which variables are set (`JWT_SECRET`, `ENCRYPTION_KEY`, `CRON_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `R2_PRIVATE_BUCKET_NAME`, `CORS_ALLOWED_ORIGINS`) and whether `JWT_SECRET` differs from the local value.
- Whether the Aadhaar encryption script has been run on production, and whether any other copy of the production connection string exists (CI, other machines, chat history).

---

## Appendix: Top 10 findings (short form)

1. F1 CRITICAL (unverified): no RLS anywhere in the repo; Data API may expose every table to the public anon key.
2. F2 HIGH: app's database role bypasses RLS; zero database-level tenant defence.
3. F4 HIGH: one `JWT_SECRET` signs every role and school; leak means full compromise; strength unverified.
4. F7 MEDIUM: Aadhaar data stays plaintext on production until the encryption script runs; PAN and bank details never encrypted.
5. F8 MEDIUM: identity documents go to the public bucket if the private bucket variable is unset.
6. F3 MEDIUM: tenant filtering is manual per query; 14 tables have no `schoolId`.
7. F6 MEDIUM: any teacher can read attendance of any student in the school.
8. F5 MEDIUM: session validity check fails open on database errors and for unlisted roles.
9. F9 LOW: production database URL stored in files on the developer machine (gitignored, not in git).
10. F12 LOW: app role privileges and pooling unverified; likely over-privileged.
