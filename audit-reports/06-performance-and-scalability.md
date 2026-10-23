# 06 - Performance and Scalability Audit (A5)

## Scope
Query efficiency, pagination coverage, raw SQL, connection handling, caching, client bundle weight, images, bulk/background work and expected bottlenecks at 10x/100x data. ADMIN repo only (`C:\Users\Tashaf\Desktop\SchoolMS\adminpanel`), current working tree. No benchmark was run and no number below is measured; every "at scale" statement is code-based reasoning plus a proposed test.

## Method
- Grep inventory of all `findMany` (166 occurrences in `lib` and `app/api`), `$queryRaw` (4 sites), `unstable_cache`/`cache(` (2 sites), `'use client'` (193 of 415 `.jsx` files under `app` and `components`), `setInterval` polling, static imports of heavy libraries.
- Read in full: `lib/db.js`, `lib/classes.js` roster loaders, `lib/fees.js` generation/stat loaders, `lib/students.js` bulk/promote/delete, `lib/notices.js` fan-out, `lib/attendance.js` trend, `lib/rbac.js` actor loader, `lib/iam.js`, paged routes.
- Not run: `next build` (forbidden), any HTTP load, `EXPLAIN`. Production pooler configuration was not verified (see PERF-004).
- Index coverage against query patterns is already covered by DB-004 (05 report); not repeated here.

## Summary table
| ID | Sev | Conf | Title | Component |
|---|---|---|---|---|
| PERF-001 | P2 | High | Class/section pages and student list load the entire school roster including JSON blobs | lib/classes.js, lib/students.js |
| PERF-002 | P2 | High | Fee generation loads whole roster and issues one create per student in one array transaction | lib/fees.js |
| PERF-003 | P2 | High | Dashboard attendance trend scans every attendance row ever stored for the school | lib/attendance.js |
| PERF-004 | P2 | Medium | No connection-pool configuration in code or schema; fan-out patterns can exhaust a serverless pool | lib/db.js, prisma/schema.prisma |
| PERF-005 | P2 | High | Bulk student import: full roster read, sequential inserts, unbounded parallel fee generation, no row cap | students/bulk-import |
| PERF-006 | P2 | Medium | Student promotion/retention does 3 sequential queries per student inside a default-timeout interactive transaction | lib/students.js |
| PERF-007 | P2 | High | Whole-school aggregates computed in JavaScript (fees dashboard, exam dashboard) | lib/fees.js, lib/exams.js |
| PERF-008 | P3 | Medium | Every protected request re-loads user + role + all permissions uncached; polling multiplies it | lib/rbac.js, lib/iam.js |
| PERF-009 | P3 | Medium | Attendance reports pull JSON `records` for the whole range and scan in JS | lib/attendance.js |
| PERF-010 | P3 | Medium | Heavy libraries statically imported into client components; no `next/dynamic` anywhere | components |
| PERF-011 | P3 | High | `pageSize` uncapped on payments and schools list routes; remaining unbounded list endpoints | app/api |
| PERF-012 | P3 | Medium | Notice/exam notification fan-out is O(recipients) in memory on the request process, unawaited | lib/notices.js |
| PERF-013 | P4 | High | Support unread count loads every ticket row; calendar cache invalidates all tenants | lib/support.js, lib/calendarEvents.js |

## Findings

### PERF-001 - Whole-roster loads on class, section and student-list pages
- **Category:** Database / Performance
- **Severity:** P2   **Confidence:** High   **Status:** Confirmed (code-based; impact not measured)
- **Affected component:** Classes and Sections pages, student list print page, `GET /api/students` (admin)
- **Evidence:** `lib/students.js:207-210` `getSchoolStudents` is `findMany({ where: { schoolId } })` with no `select`, no session filter, no `take`, then `decorateStudent` per row; `getAllStudents` wraps it (`:241`). Callers: `lib/classes.js:181` (`getClassesForSession`, runs for every class list view), `:219` (`getClassById`), `:232` (`getSectionDetail`), `:318` and `:335` (class update/status change), `app/dashboard/students/list/page.jsx:15`, `app/api/students/route.js:35`, `lib/fees.js:436`, `lib/students.js:553`. The `Student` row carries about 8 Json blobs (`schema.prisma:385-400`: guardian, secondaryGuardian, otherGuardian, emergencyContacts, address, feeDetails, documents, previousSchool). The roster is also not session-filtered, so students of past sessions are loaded and then filtered in JS (`classes.js:232-236`).
- **Impact:** Class and section screens cost O(all students of all sessions x row width) although they need counts per class/section. At 10x this is thousands of wide rows per page view and per class edit. The paged student/teacher/fee routes were already fixed; these call sites were not.
- **Reproduction / verification:** code-based; not executed. Test: seed a scratch DB with 5k and 50k students, time `GET /dashboard/classes` and read Prisma query log / `pg_stat_statements` rows returned.
- **Root cause:** Class decoration (`decorateClass(row, students)`) takes the full roster to compute per-section counts in JS.
- **Recommended fix:** Replace with `prisma.student.groupBy({ by: ['class','section'], where: { schoolId, academicSession }, _count: true })` for list views; for section detail use a filtered, `select`ed `findMany` (class + section + session) or the paged route. Keep `getAllStudents` only for true exports.
- **Validation:** Same page, same output, rows returned from DB drops from roster size to number of groups.
- **Effort:** M   **Dependencies:** API-006

### PERF-002 - Fee generation: full roster, N creates in one transaction
- **Category:** Backend / Performance
- **Severity:** P2   **Confidence:** High   **Status:** Confirmed (code-based)
- **Affected component:** `generateStudentFees` (admin button) and `generateDueStudentFees` (daily cron)
- **Evidence:** `lib/fees.js:436-439` loads `getAllStudents` then filters class, session and status in JS; `:445-452` loads existing fees `IN (all eligible ids)` (a single large IN list); `:477-503` builds `prisma.$transaction([...toCreate.map(create with nested items), ...toUpdate.map(update with deleteMany + create)])`. One statement set per student plus nested item inserts. No `createMany`, no batching, no `maxDuration` export on the cron route (`app/api/cron/generate-fees/route.js`). Overlaps API-011 and BIZ-001; the performance angle is new.
- **Impact:** At 10x students per class (or a cron that later iterates many schools, BIZ-001), a single request holds one DB transaction with hundreds to thousands of round trips and one very large IN list; a failure at any statement (including the P2002 unique race) rolls back everything and returns 500. Vercel function time limit applies; not verified for this plan.
- **Reproduction / verification:** code-based. Test: scratch DB, one class with 500 then 5,000 eligible students, time the call and watch transaction duration.
- **Root cause:** Per-row Prisma writes in an array transaction; JS filtering instead of `where`.
- **Recommended fix:** Query only `where: { schoolId, class, academicSession, status: 'Active' }` with a narrow `select`; chunk in batches of a few hundred; `studentFee.createMany({ skipDuplicates: true })` then `studentFeeItem.createMany` keyed by returned ids; export `maxDuration` on the cron route.
- **Validation:** Same results (counts) with fewer statements; concurrent run does not abort.
- **Effort:** M   **Dependencies:** API-011, BIZ-001

### PERF-003 - Attendance trend scans all history on every dashboard load
- **Category:** Database / Performance
- **Severity:** P2   **Confidence:** High   **Status:** Confirmed (query shape); runtime not measured
- **Affected component:** Admin dashboard attendance chart
- **Evidence:** `lib/attendance.js:387-396` raw SQL expands `jsonb_array_elements` over `Attendance.records` for `WHERE "schoolId" = $1 GROUP BY session, date, status` with no date or session bound; called unconditionally per render at `app/dashboard/page.jsx:113`; result is then folded in JS (`:398-409`). This replaced a full-row load (good) but still reads every row's JSON.
- **Impact:** Cost grows with (sections x school days x years x students per section). Each dashboard visit pays it; unindexed JSON expansion cannot be narrowed by an index (see DB-007, DB-004).
- **Reproduction / verification:** code-based. Test: scratch DB with 3 years of attendance for 40 sections, run the query under `EXPLAIN (no ANALYZE)` and time it from Node; compare after bounding.
- **Root cause:** Series are all-time by design (by date, month, session); no pre-aggregation.
- **Recommended fix:** Bound the default query (for example current session or last 12 months) and load other sessions on demand; or maintain a small `AttendanceDailySummary(schoolId, date, present, absent, ...)` updated in `saveAttendance`; at minimum wrap in `unstable_cache` keyed by schoolId with a short revalidate and a tag cleared on save.
- **Validation:** Dashboard attendance query time stays flat as history is added.
- **Effort:** M   **Dependencies:** DB-007, DB-004

### PERF-004 - Connection pooling is unconfigured in the repo
- **Category:** DevOps / Performance
- **Severity:** P2   **Confidence:** Medium   **Status:** Suspected (production settings not verified)
- **Affected component:** `lib/db.js`, Vercel deployment, Postgres
- **Evidence:** `lib/db.js:3-7` builds `new PrismaClient()` with no options, cached on `globalThis`. `prisma/schema.prisma:18-21` has `url = env("DATABASE_URL")` only: no `directUrl`. Local `.env` has `DATABASE_URL` pointing at localhost with no pool query parameters (host and parameter names only inspected; no values printed). `vercel.json` sets region `syd1` and two crons only. Fan-out sites that open many concurrent queries per request: `bulk-import/route.js:20` (`Promise.all` over imported students, each running several queries), dashboard `Promise.all` of about 10 queries (`lib/dashboard.js:98-110`, `:342-366`), `lib/pushTokens.js:37`, `lib/notices.js:473-478`.
- **Impact:** On serverless each concurrent function instance gets its own pool (Prisma default is derived from CPU count). Many instances plus bursty `Promise.all` can exceed Postgres `max_connections` (Supabase direct connections are limited); symptoms are `P1001/P2024` timeouts under load. Whether a pooler is already in the production URL is not known.
- **Reproduction / verification:** Not verified. Check: production `DATABASE_URL` host/port and `pgbouncer=true&connection_limit=` parameters via the hosting dashboard (do not paste the value), and `SELECT count(*) FROM pg_stat_activity` during a load test.
- **Root cause:** Pooling left to defaults; no documented production DB topology.
- **Recommended fix:** Use the provider's transaction pooler for runtime with `?pgbouncer=true&connection_limit=1..N`, add `directUrl` for migrations (also needed for DB-001), cap concurrency in bulk loops (see PERF-005), document in README.
- **Validation:** Load test with N concurrent dashboard loads; `pg_stat_activity` stays below limit; no `P2024`.
- **Effort:** S   **Dependencies:** DB-001

### PERF-005 - Bulk import is the weakest bulk path
- **Category:** Backend / Performance
- **Severity:** P2   **Confidence:** High   **Status:** Confirmed (code-based)
- **Affected component:** `POST /api/students/bulk-import`
- **Evidence:** `app/api/students/bulk-import/route.js:14-20` accepts any length `rows` (API-006), calls `bulkCreateStudents` then `Promise.all(imported.map(generateFeesForNewStudent))` (unbounded concurrency). `lib/students.js:552-560` loads the whole roster (`getSchoolStudents`, all columns) just to build a Set of admission ids, then inserts one student at a time (a comment states intent: per-row isolation). No `maxDuration`.
- **Impact:** A 2,000-row sheet means a full-roster read, 2,000 sequential multi-query inserts, then up to 2,000 concurrent fee generations competing for pool slots (PERF-004). Likely to exceed serverless duration and leave a partially imported file with the user seeing a timeout.
- **Reproduction / verification:** code-based. Test in scratch DB with 200, 1,000, 5,000 rows; record duration, peak connections.
- **Root cause:** Correctness-first per-row design with no batching limits.
- **Recommended fix:** Cap rows (for example 500 per request) and chunk on the client; check duplicates with `findMany({ where: { schoolId, admissionId: { in: rowIds } }, select: { admissionId: true } })`; run fee generation with bounded concurrency (for example 5) or `createMany`.
- **Validation:** Import of the same file finishes in several bounded requests; connections stay low.
- **Effort:** M   **Dependencies:** API-006, API-011, PERF-004

### PERF-006 - Promotion/retention: sequential per-student work in an interactive transaction
- **Category:** Backend / Performance
- **Severity:** P2   **Confidence:** Medium   **Status:** Suspected (timeout behaviour is Prisma default; not executed)
- **Affected component:** `promoteStudents`, `retainStudentsInSession`
- **Evidence:** `lib/students.js:767-805`: inside `prisma.$transaction(async (tx) => ...)` with no `{ timeout, maxWait }` option (grep shows no transaction options anywhere in `lib`), a `for (const s of students)` loop runs `applyEnrollment` (findUnique then create, `:101-119`) plus `studentPromotionLog.create` per student, i.e. about 3 round trips each. Student ids list has no cap.
- **Impact:** End-of-year promotion is the heaviest regular action. Interactive transactions default to a short timeout in Prisma; a large class or the whole school promoted at once can time out and roll back entirely, after the `updateMany` has already been issued within the transaction (rollback leaves consistent state, but the admin cannot complete the action).
- **Reproduction / verification:** code-based. Test: promote 50, 500, 2,000 students in a scratch DB over a remote-latency connection.
- **Root cause:** Per-row writes in a transaction with default limits.
- **Recommended fix:** Use `createMany` for enrollments and logs after one `findMany` of existing enrollments; if keeping a loop, pass `{ timeout: ... }` explicitly and cap batch size with UI chunking.
- **Validation:** 2,000-student promotion completes or fails with a clear partial-progress message.
- **Effort:** M   **Dependencies:** BIZ-008

### PERF-007 - Whole-school aggregates computed in JS
- **Category:** Database / Performance
- **Severity:** P2   **Confidence:** High   **Status:** Confirmed (code-based)
- **Affected component:** Admin dashboard fee cards, exams dashboard
- **Evidence:** `lib/fees.js:1340-1356` `loadSchoolFees` = every `StudentFee` of the school (all sessions) with nested `items` and `student`, memoised per request by React `cache` and then summed in JS by `getFeesStats` (`:1359`), overdue and collected helpers (`:1461-1509`). `lib/exams.js:354-357` loads every `ExamSchedule` and every `ExamMark` row for the school (`select` of two columns, but one row per student per subject per exam) to count statuses in JS (`:372-375`). Contrast: `lib/fees.js:1408-1418` already uses `groupBy`/raw SQL for the chart.
- **Impact:** Dashboard cost scales with all fee rows ever created (students x terms x years) and all marks ever entered. ExamMark is the fastest-growing table; at 10x it dominates.
- **Reproduction / verification:** code-based. Test: 10k students x 4 terms; time `/dashboard` and log rows read.
- **Root cause:** Late-fee/discount logic lives in JS (`lateFeeAmountFor`, `discountAmountFor`), so aggregates cannot be pushed to SQL directly.
- **Recommended fix:** For exams use `groupBy({ by: ['examScheduleId','status'], _count })` or `count` with filters. For fees: push the invariant parts to SQL (sum totalAmount/paidAmount by session) and compute late fees only for fees that are not PAID and overdue, restricted to the active session; consider storing late fee when applied (also DB-010).
- **Validation:** Dashboard result unchanged; rows read per request drop.
- **Effort:** M   **Dependencies:** DB-010

### PERF-008 - Per-request auth cost: uncached, deeply joined
- **Category:** Backend / Performance
- **Severity:** P3   **Confidence:** Medium   **Status:** Suspected (query counts not measured)
- **Affected component:** `requirePermission`, `getCurrentUserInfo`
- **Evidence:** `lib/rbac.js:91-95` loads `user` with `role -> permissions -> permission` on every call (and a `role` lookup with the same include in the fallback branch, `:113-116`). `getCurrentUserInfo()` has 129 call sites (`lib/iam.js:18` onward: admin or user row, school row, for Teachers also `section.findMany` and `school.findUnique`). The only React `cache()` in the repo is `lib/fees.js:1340`, so a route that calls both gets duplicate lookups within one request. Client polling: `components/dashboard/NotificationBell.jsx:53` and `TeacherNotificationBell.jsx:70` every 60 s per open tab.
- **Impact:** Constant overhead on every API call and on each polling tick; grows linearly with concurrent users. Permission sets rarely change.
- **Reproduction / verification:** Enable Prisma query logging in a scratch run and count queries for one `GET /api/notices/page`.
- **Root cause:** No request-scoped memoisation and no short-TTL cache of role permissions.
- **Recommended fix:** Wrap `getCurrentRBACUser` and `getCurrentUserInfo` in React `cache()`; cache role-permission sets with `unstable_cache` (tag cleared on role edit, key by role id).
- **Validation:** Query count per request drops; permission edits still take effect within the TTL.
- **Effort:** S-M   **Dependencies:** API-004

### PERF-009 - Attendance reports read all JSON rows for the range
- **Category:** Database / Performance
- **Severity:** P3   **Confidence:** Medium   **Status:** Confirmed (code-based)
- **Evidence:** `lib/attendance.js:178-188` `fetchAttendanceMap` returns every `Attendance` row in range (full `records` JSON) and callers (`:273`, `:297`, `:332`, `:361`, `:472`, `:519`) then index into arrays in JS; per-student history cannot be indexed (DB-007).
- **Impact:** Per-student and range reports download whole sections' records for each day; heavy at a full-year range.
- **Recommended fix:** Restrict `select` to needed columns, bound ranges in the API, or move to a row-per-student table if per-student reporting is hot (benchmark first, per DB-007).
- **Validation:** Report latency against range length.
- **Effort:** M   **Dependencies:** DB-007, PERF-003

### PERF-010 - Heavy client dependencies imported statically
- **Category:** Frontend / Performance
- **Severity:** P3   **Confidence:** Medium   **Status:** Confirmed (imports); bundle size not measured (build forbidden)
- **Evidence:** `chart.js` + `react-chartjs-2` imported in five client components (`components/dashboard/AttendanceCollectionChart.jsx:4-5`, `FeeCollectionChart.jsx:4-5`, `ClasswiseAttendanceModal.jsx:3-4`, `ClasswisePendingFeesModal.jsx:3-4`, `ClassWiseStudentsModal.jsx:3-4`); `xlsx` in three client files (`components/students/BulkImportModal.jsx:4`, `components/performance/BulkImportModal.jsx:4`, `components/performance/TestMarksEntry.jsx:5`); `country-state-city` through `lib/location.js:1` into five forms (`StudentForm`, `TeacherForm`, `ContactAddressForm`, `StepContactAddress`, `EditSchoolModal`). `next/dynamic` / `React.lazy` appear nowhere in `app`, `components` or `lib`. 193 of 415 `.jsx` files are `'use client'`. `package.json` pins xlsx to a CDN tarball.
- **Impact:** Chart and spreadsheet libraries load with the page that contains them even when the modal is never opened (the three modals are opened on click). `country-state-city` ships a large dataset to every form page.
- **Recommended fix:** `dynamic(() => import(...), { ssr: false })` for the three chart modals and the two bulk-import modals; load `country-state-city` lazily on first form open. Verify with `next build` output or `@next/bundle-analyzer` in a scratch copy (not run here).
- **Validation:** Compare first-load JS per route before and after.
- **Effort:** S   **Dependencies:** none

### PERF-011 - Pagination coverage gaps and uncapped page sizes
- **Category:** Backend / Performance
- **Severity:** P3   **Confidence:** High   **Status:** Confirmed
- **Evidence:** `app/api/payments/route.js:21` and `app/api/schools/route.js:16` use `Number(pageSize) || 20` with no upper bound (`?pageSize=1000000` is accepted, and a negative `page` yields a negative `skip`). Paged routes elsewhere cap properly (table below). Remaining unbounded: see table and API-006.
- **Impact:** One request can read an entire payments table. Authenticated callers only; the cost is DB and memory.
- **Recommended fix:** Same clamp used in `app/api/homework/page/route.js:24`; also clamp `page >= 1`.
- **Validation:** Request with huge `pageSize` returns at most the cap.
- **Effort:** S   **Dependencies:** API-006

### PERF-012 - Notification fan-out is in-memory and not awaited
- **Category:** Backend / Performance
- **Severity:** P3   **Confidence:** Medium   **Status:** Suspected
- **Evidence:** `lib/notices.js:399-407` loads every teacher or student id for "All Staff"/"All Parents"; `:473-478` batches parent-link lookups by 500 but runs all batches in `Promise.all`; `lib/parentNotifications.js:22-35` is one `createMany` of N rows; the whole sequence is fire-and-forget (comment at `lib/notices.js:~460`; BIZ-009). `lib/pushTokens.js:37` batches IN lists.
- **Impact:** Whole-school notices cost memory and DB work linear in students, off the request path; on serverless the work may be cut when the response returns (lost in-app and push notifications), a reliability problem more than speed.
- **Recommended fix:** Await within the handler for bounded recipient counts or use `waitUntil`/`after()` (check `node_modules/next/dist/docs/` for the version's API); batch `createMany` in chunks; bound `Promise.all` concurrency.
- **Validation:** Create a notice for a large school scratch DB; all recipients receive rows.
- **Effort:** M   **Dependencies:** BIZ-009

### PERF-013 - Minor: support unread count and global calendar tag
- **Category:** Backend
- **Severity:** P4   **Confidence:** High   **Status:** Confirmed
- **Evidence:** `lib/support.js:85-95` counts unread tickets by loading every ticket row (`select` two columns) and filtering in JS; super-admin version has no `where`. `lib/calendarEvents.js:38-47` cache key includes the `schoolId` argument (no cross-tenant leak, verified) but `revalidateTag('calendar-events')` (`:92,101,110`) invalidates every school.
- **Recommended fix:** `count({ where: { schoolId, OR: [...] } })` using a column comparison via raw SQL or a boolean `unread` flag; use per-school tags `calendar-events:${schoolId}`.
- **Effort:** S   **Dependencies:** none

## Pagination coverage per list endpoint
Verified by reading the route and lib function for each row; "cap" is the enforced maximum page size.

| Endpoint | Paginated | Cap | Notes |
|---|---|---|---|
| `GET /api/students/paged` | Yes | 100 | DB-side (`students/paged/route.js:25`) |
| `GET /api/students` | No | none | full roster, decorated (PERF-001) |
| `GET /api/teachers/paged` | Yes | 100 | `teachers/paged/route.js:16` |
| `GET /api/fees/students/summary` | Yes | 500 | `summary/route.js:11,32`; DB-paged when no paid/due sort (`lib/fees.js:789`), else full load then JS slice (`:799-812`) |
| `GET /api/homework/page` | Yes | 50 | |
| `GET /api/notices/page`, `/api/parent/notices`, `/api/parent/homework`, `/api/parent/exams` | Yes | 50 | |
| `GET /api/notices/paged` | Yes | fixed 10 | |
| `GET /api/payments` | Yes | none | PERF-011 |
| `GET /api/schools` | Yes | none | PERF-011 |
| `GET /api/students/print-details` | Fixed 500 | 500 | print use |
| `GET /api/users`, `/api/subjects`, `/api/support/tickets`, exams list, calendar, admins, roles, permissions | No | none | bounded in practice by school size; see API-006 |
| Parent notifications | Yes | limit param | `lib/parentNotifications.js:58` uses `limit+1` pattern |

Note: the fee summary route keeps a full-load path for Paid/Due sort (`lib/fees.js:799-812`), so the refactor is partial for that sort mode.

## Raw SQL inventory
4 sites, all tagged-template `$queryRaw` with parameter binding (no `$queryRawUnsafe`, no string concatenation): `lib/attendance.js:389` (trend, PERF-003), `lib/fees.js:1408` (collected by session, indexed on `Payment.studentFeeId` missing, see DB-004), `lib/teachers.js:204` (JSON `@>` on `assignments`, no GIN index, scans the school's teachers), `lib/support.js` (seen-at update, avoids touching `updatedAt`). No injection risk found in these.

## Caching
- `unstable_cache`: only `lib/calendarEvents.js:38` (30 s, key includes `schoolId` argument, tag clear on write). No private-data leakage found: the school id is an explicit cache key argument and is resolved outside the cached function.
- React `cache`: only `loadSchoolFees` (`lib/fees.js:1340`), per-request.
- `force-dynamic` on 13 pages/routes; client fetches use `cache: 'no-store'` (`lib/api.js`). No `Cache-Control` strategy for read-mostly lists (classes, subjects, settings). Opportunity: per-school tagged caches for subjects, classes, school settings, role permissions (PERF-008).

## Frontend and images
- 193 of 415 JSX files are client components; layouts and top pages are mostly server components where redesign work was done. Not measured.
- Images: client-side WebP compression to a maximum of 800 px before upload (`lib/imageCompression.js`), direct-to-R2 presigned upload, so the server never proxies bytes (good). Display uses 20 raw `<img>` tags (logo, avatars) and `next/image` only on login/404 pages; no `images` config in `next.config.mjs`. No responsive sizes or lazy loading on avatar lists beyond browser defaults. Low impact (small WebP files), informational.
- Polling: two notification bells every 60 s per tab.

## Background and bulk operations
| Operation | Where | Concern |
|---|---|---|
| Generate fees (admin and cron) | `lib/fees.js:427`, cron route | PERF-002; cron fans over one school (BIZ-001) |
| Bulk import | `lib/students.js:552` | PERF-005 |
| Promote/retain | `lib/students.js:760` | PERF-006 |
| Bulk collect / reminders | `lib/fees.js` (`bulkCollectFullDue`), `fees/send-reminder` | uncapped `studentIds` (API-006) |
| Notices fan-out | `lib/notices.js:399-480` | PERF-012 |
| Support ticket cleanup cron | `lib/support.js:236-250` | loads all stale tickets with replies, then `Promise.all` of R2 deletes unbounded; fine at current scale, bound at 100x |
| Report jobs | `GeneratedReportJob` has no code references (DB-013) | n/a |

## Expected bottlenecks (ranked, reasoning only)
1. 10x (about thousands of students): class pages (PERF-001), dashboard fee/exam aggregates (PERF-007), attendance trend (PERF-003).
2. 100x (multi-school SaaS, tens of schools on one DB): connection exhaustion (PERF-004), per-request RBAC queries (PERF-008), table growth in `ExamMark`, `Attendance.records`, `ParentNotification`, unindexed `Payment` (DB-004), cron single-tenant (BIZ-001).
3. Operational spikes: term-start fee generation, year-end promotion, whole-school notices at a fixed hour for all schools.

## Recommended measurable tests (no numbers invented)
1. Scratch/local DB seeded at 1x, 10x, 100x of a reference school; record for each: dashboard TTFB, `/dashboard/classes` TTFB, rows read per request (Prisma `log: ['query']` or `pg_stat_statements`), p50/p95 of the paged list routes.
2. `EXPLAIN` (no ANALYZE) on the five hottest queries after seeding, checking Seq Scan versus index use (DB-004 list).
3. Concurrency: 20/50/100 parallel sessions loading the dashboard against the pooler URL; watch `pg_stat_activity` and error rates (PERF-004).
4. Bulk: import 200/1,000/5,000 rows; promote 50/500/2,000; generate fees for 500/5,000; record duration and peak connections.
5. Bundle: run the build in a scratch copy and record first-load JS per route before and after dynamic imports (PERF-010).

## Positive observations
- Server-side pagination with caps exists for students, teachers, homework, notices and the parent portal; `TEACHER_STUDENT_SELECT` avoids blobs for teacher roster reads.
- Dashboard recent-activity queries are `take`-bounded with narrow `select` (`lib/dashboard.js:342-366`); fee chart uses DB aggregation (`lib/fees.js:1408`).
- All raw SQL is parameterised; photo uploads bypass the server; the only `unstable_cache` is tenant-keyed.
- PrismaClient is a hot-reload-safe singleton.

## Limitations / not assessed
No load test, no `next build`, no `EXPLAIN`, no production DB or Vercel configuration inspection, no browser profiling. Bundle claims are import-level only. About 160 of 166 `findMany` sites were classified by grep (presence of `take`, scoping) and about 40 were read in context; remaining ones are small tenant-scoped lookups.
