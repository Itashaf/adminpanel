# SchoolApp360 - Remediation checklist

Generated 16 October 2026 from the audit. Tick a box only after the validation step passes. IDs refer to `project-audit-findings.csv`.

## Phase 0 - Immediate containment

- [ ] **Remove the session-less fallback actor and make resolveSchoolId session-only** (API-001, API-002, SEC-004, SEC-017; effort M)
  - Done when: An unauthenticated request to any /api route returns 401; no route reads or writes the global school singleton.
- [ ] **Add authentication to the five unguarded handlers (fee ledger, create-order, verify, attendance by student, subjects GET) and to POST /api/schools** (API-002, API-003; effort S)
  - Done when: Each handler returns 401/403 without a valid session; a test per route.
- [ ] **Fail closed when CRON_SECRET is unset; set it in every environment; iterate all active schools** (BIZ-001, OBS-003, OBS-004, OPS-002; effort S)
  - Done when: Cron without the bearer returns 401; a run generates fees for every active school.
- [ ] **Upgrade next to the patched release and re-run npm audit** (SEC-008; effort S)
  - Done when: npm audit shows no critical; app builds and logs in.

## Phase 1 - Security, authorization, data integrity, production blockers

- [ ] **Per-route permission checks for homework, marks, student records; guards on dashboard pages** (SEC-001, SEC-002, SEC-005, SEC-006, PRV-001; effort M)
  - Done when: Parent/Accountant requests to those routes return 403; Teacher cannot render Teachers/Fees/Settings pages.
- [ ] **Tenant-scope roles and permissions; session revocation** (API-004, SEC-003; effort L)
  - Done when: Editing a role in one school never changes another; a deactivated user is rejected on the next request.
- [ ] **Payment webhook, reconcile job, transactional collection with cap** (BIZ-002, BIZ-003, DB-002, OBS-007, FE-001, ARC-002; effort M)
  - Done when: Replayed webhook gives one payment; parallel collections cannot exceed due.
- [ ] **Private storage for identity documents and unguessable keys** (ARC-001, PRV-002, API-007; effort M)
  - Done when: Unauthenticated GET of a document URL returns 403.
- [ ] **Full-schema baseline migration and migrate deploy in release; confirm backups** (DB-001, OPS-005, OPS-003; effort M)
  - Done when: A fresh database builds from migrations; restore rehearsal documented.
- [ ] **Test runner plus integration tests for auth, tenancy, payments; CI pipeline** (TST-001, OPS-001, TST-003, FE-003; effort L)
  - Done when: CI runs lint, build, tests and audit on every pull request and is green.
- [ ] **Security headers, CORS allow-list, durable rate limit, server-side validation, credential cleanup** (SEC-007, API-008, API-005, SEC-014, MOB-001, MOB-002, OPS-009, PRV-003; effort L)
  - Done when: Headers present; limiter works across instances; invalid bodies return 400.

Other findings in this phase:
- [ ] DB-003 (P1) Login identity is looked up by email only, but uniqueness is per school (or absent): ambiguous account resolu…

## Phase 2 - Functional defects and reliability

- [ ] **Error boundaries, generic error messages, error tracking and health endpoint** (FE-002, ARC-004, OBS-002, API-009, OBS-001, OPS-004, OBS-009; effort M)
  - Done when: A thrown render error shows the boundary; /health returns 200; errors reach the tracker.
- [ ] **Audit trail, refunds, notification delivery, business-rule fixes** (OBS-008, BIZ-004, BIZ-005, BIZ-006, BIZ-008, BIZ-009, BIZ-010; effort L)
  - Done when: Sensitive actions leave audit rows; marks edits after publish recompute results.
- [ ] **Remove whole-roster loads in classes, fees, bulk import, promotion** (PERF-001, PERF-002, PERF-003, PERF-005, PERF-006; effort L)
  - Done when: Measured response time and memory stay flat as rows grow (test listed in report 06).
- [ ] **Privacy: notice, consent, retention and erasure** (PRV-004, PRV-005, PRV-006; effort L)
  - Done when: Erasure request removes data and files; privacy notice linked.

Other findings in this phase:
- [ ] API-006 (P2) Unbounded list responses and unbounded request arrays
- [ ] DB-005 (P2) Hard delete of a Student cascades away exam results, marks, enrollment history and the "append-only" promotio…
- [ ] DB-006 (P2) All business dates are String; school timezone setting is never used to compute "today"
- [ ] DB-008 (P2) Seed script is stale against the schema and embeds plaintext demo credentials and fixed school-1 ids
- [ ] FE-004 (P2) No global 401/expired-session handling in client fetch layer
- [ ] MOB-003 (P2) No 401 handling; logout does not reset RTK Query cache
- [ ] MOB-004 (P2) Push token never unregistered on logout
- [ ] MOB-005 (P2) Razorpay verify failure shown as Payment failed after capture
- [ ] OBS-005 (P2) Cron/job failures are swallowed: HTTP 200 and no alert
- [ ] OBS-006 (P2) Push / realtime / in-app notification failures are console-only, no retry or record
- [ ] OBS-010 (P2) No backup/restore or incident-response documentation
- [ ] OPS-006 (P2) Login rate limit stored in process memory
- [ ] TST-002 (P2) MOBILE jest configured but zero app tests; jest/babel-jest version mismatch

## Phase 3 - Performance, scalability, maintainability

- [ ] **Indexes, pooling, caching of user and permissions** (DB-004, PERF-004, PERF-008, PERF-011; effort M)
  - Done when: EXPLAIN shows index use on listed queries; no connection exhaustion in a load test.
- [ ] **Real foreign keys for class, section, subject; remove duplicate sources of truth** (REL-004, REL-005, DB-007, BIZ-007; effort XL)
  - Done when: Renaming a class does not break history; orphan counts are zero.
- [ ] **Split god modules and share duplicated helpers** (MNT-001, REL-007, REL-008; effort L)
  - Done when: Largest module below an agreed size; one formatCurrency.

Other findings in this phase:
- [ ] PERF-007 (P2) Whole-school aggregates computed in JavaScript (fees dashboard, exam dashboard)
- [ ] REL-001 (P2) Fee and payment relationship: denormalised paidAmount with unconstrained Payment links
- [ ] REL-002 (P2) Student delete cascade policy is inconsistent across child tables
- [ ] REL-003 (P2) Login identities are not unique across tenants (Teacher has no unique email)
- [ ] API-010 (P3) Temp passwords generated with Math.random and returned in the response
- [ ] API-011 (P3) Sequential awaits / N+1 / full-school loads in fee generation, bulk import, teacher student list
- [ ] ARC-003 (P3) middleware.js uses the file convention deprecated in Next 16 (renamed proxy)
- [ ] DB-009 (P3) Status/type fields mix real enums with free strings
- [ ] DB-010 (P3) Money design: whole-rupee Int, derived payable amount, no DB invariants, hard-coded INR/paise
- [ ] DB-011 (P3) DB-level invariants documented as "enforced in code" are not enforced (one active session, one class-teacher …
- [ ] DB-012 (P3) Child tables without schoolId (ReportLock cannot be tenant-scoped at all)
- [ ] FE-005 (P3) Duplicate uncached server fetch in generateMetadata and page
- [ ] FE-006 (P3) Possible double fetch on filter change; heavy router.refresh use
- [ ] FE-007 (P3) No request cancellation (AbortController in 0 files)
- [ ] FE-009 (P3) Very large components
- [ ] MNT-003 (P3) xlsx installed from vendor CDN tarball
- [ ] MNT-004 (P3) Process-local globalThis/Map state used as stores
- [ ] MOB-006 (P3) Silent localhost API fallback; login error reveals API URL
- [ ] MOB-007 (P3) No tests despite jest setup
- [ ] MOB-009 (P3) Offline handling is banner-only; no draft/write queue
- [ ] MOB-012 (P3) Very large mobile screen files
- [ ] OBS-011 (P3) Dev-email fallback prints recipient and full message body to logs
- [ ] OBS-013 (P3) Login abuse limiter is per-instance memory with no alerting or failed-login record
- [ ] OPS-007 (P3) No security headers; empty next.config
- [ ] PERF-009 (P3) Attendance reports pull JSON records for the whole range and scan in JS
- [ ] PERF-010 (P3) Heavy libraries statically imported into client components; no next/dynamic anywhere
- [ ] PERF-012 (P3) Notice/exam notification fan-out is O(recipients) in memory on the request process and unawaited
- [ ] PRV-007 (P3) Unredacted error objects logged; token logged in push errors
- [ ] REL-006 (P3) No tenant off-boarding path: every School FK is Restrict, children mixed
- [ ] SEC-009 (P3) nodemailer 10.0.1 has multiple advisories (DoS, cross-transport TLS servername reuse); sharp has libheif/libr…
- [ ] SEC-010 (P3) Set-password link: no server-side password policy, 7-day plaintext token, no redemption throttling, no status…
- [ ] SEC-011 (P3) Login rate limiter is bypassable and enables targeted lockout: client-controlled x-forwarded-for first hop, p…
- [ ] SEC-012 (P3) Cross-tenant reference gaps: section update not tied to class, classTeacherId and marks studentId not validat…
- [ ] SEC-013 (P3) Login lookups by email are global while uniqueness is per school or absent, so same-email accounts collide
- [ ] SEC-016 (P3) Push token registration transfers ownership of an existing token to the caller
- [ ] UX-003 (P3) Mixed loaders: PageLoader spinner vs shimmer skeletons
- [ ] UX-004 (P3) Unsaved-changes guard only in timetable editor
- [ ] UX-005 (P3) Inconsistent pagination pattern (fixed bar copies vs inline)

## Phase 4 - Testing, monitoring, documentation, ongoing hardening

- [ ] **Accessibility pass** (UX-001, UX-002, MOB-008; effort M)
  - Done when: Keyboard-only walkthrough of core flows succeeds.
- [ ] **Docs, runbook, dead-code removal, tracked scratch files** (MNT-002, ARC-005, OBS-012, OPS-008, TST-004; effort S)
  - Done when: README covers setup, env, deploy, recovery; scratch files untracked.

Other findings in this phase:
- [ ] DB-013 (P4) Dead / stale schema elements
- [ ] FE-008 (P4) Notification link passed to router.push unvalidated
- [ ] MNT-005 (P4) Convention notes: deprecated middleware file, raw img tags
- [ ] MOB-010 (P4) Client-side role selection; backend enforces from JWT (informational)
- [ ] MOB-011 (P4) Generated manifest requests RECORD_AUDIO and SYSTEM_ALERT_WINDOW
- [ ] PERF-013 (P4) Support unread count loads every ticket row; calendar tag invalidates all tenants
- [ ] PRV-008 (P4) Realtime channels are public with predictable names (ID-only payloads)
- [ ] SEC-015 (P4) Thirteen high-severity transitive advisories in dev tooling (eslint-config-next chain, prisma CLI chain, brac…
- [ ] SEC-018 (P4) Forgot-password timing differs for valid teacher emails (mail send awaited only on match)
- [ ] SEC-019 (P4) Hardening gaps: no CSRF token (relies on SameSite=Lax, request.json ignores content type), deprecated middlew…

## Mandatory requirements status

- [ ] M01 Every API endpoint authenticates the caller - Failed (API-001, API-002, API-003, SEC-017)
- [ ] M02 Server-side role and permission check on every write - Partial (SEC-001, SEC-002, SEC-005, SEC-006, PRV-001)
- [ ] M03 Tenant isolation derived from the session, never from process-global state - Failed (SEC-004, API-001, API-002, API-004, MNT-004)
- [ ] M04 Session revocation for deactivated users and suspended schools - Missing (SEC-003)
- [ ] M05 Durable brute-force and abuse protection - Partial (API-008, SEC-011, OPS-006, OBS-013)
- [ ] M06 Signed payment webhook plus reconciliation of pending payments - Missing (BIZ-002, OBS-007, FE-001, ARC-002)
- [ ] M07 Concurrency-safe payment recording with an overpayment cap - Failed (BIZ-003, DB-002, REL-001)
- [ ] M08 Scheduled jobs are authenticated and run for every tenant - Failed (BIZ-001, OBS-003, OBS-004, OPS-002, OBS-005)
- [ ] M09 Reproducible database migrations - Failed (DB-001, OPS-005)
- [ ] M10 Automated tests for authentication, authorization, tenant isolation and payments - Missing (TST-001, TST-002, MOB-007)
- [ ] M11 CI gates for lint, build and tests - Missing (OPS-001, TST-003, FE-003)
- [ ] M12 Patched framework and dependencies - Failed (SEC-008, SEC-009, SEC-015)
- [ ] M13 Identity documents are not publicly readable - Failed (suspected) (ARC-001, PRV-002, API-007)
- [ ] M14 No credentials in source; rotation of anything previously committed - Partial (SEC-014, DB-008)
- [ ] M15 Server-side input validation on every write route - Missing (API-005, API-006)
- [ ] M16 Security headers and a restricted CORS policy - Missing (SEC-007, OPS-007, SEC-019)
- [ ] M17 Error boundaries and non-leaky error responses - Missing (FE-002, ARC-004, OBS-002, API-009)
- [ ] M18 Audit trail for sensitive changes - Partial (OBS-008, BIZ-005)
- [ ] M19 Error tracking, structured logs and a health endpoint (admin app) - Missing (OBS-001, OPS-004, OBS-009)
- [ ] M20 Backups and a tested restore procedure - Not verified (OPS-005, OBS-010)
- [ ] M21 Environment variable validation and an example file - Missing (OPS-003)

## Conditional and recommended

- [ ] C01 (Conditional) Children data protection: notice, consent, retention, erasure (if operating in India or serving minors) - Partial
- [ ] C02 (Conditional) Refund and reversal of payments (if online payments are live) - Missing
- [ ] C03 (Conditional) Abuse limits on notification and bulk endpoints - Partial
- [ ] C04 (Conditional) Production email provider - Partial
- [ ] C05 (Conditional) Accessibility basics (WCAG 2.2 A/AA) - Partial
- [ ] C06 (Conditional) Mobile session hygiene and release assets under version control - Partial
- [ ] R01 (Recommended) Paginate or aggregate remaining whole-roster loads - Partial
- [ ] R02 (Recommended) Index coverage and pool configuration - Partial
- [ ] R03 (Recommended) Real foreign keys for class, section and subject - Missing
- [ ] R04 (Recommended) README, runbook and architecture documents - Missing