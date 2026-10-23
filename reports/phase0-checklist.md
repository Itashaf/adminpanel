# Phase 0 - Immediate containment checklist

Started 16 October 2026. Findings refer to `project-audit-findings.csv`. A box is ticked only after the change is made AND checked (lint, plus a real request against a local dev server).

Test results below come from the local dev server (local database), run with a temporary `CRON_SECRET`. Nothing was deployed and nothing was pushed.

## Tasks

- [x] **P0-1 No more "built-in Teacher" for requests without a session** (API-001, SEC-017)
  - [x] `getCurrentUserInfo()` returns null when there is no session (`lib/iam.js`)
  - [x] Routes that check for a signed-in user now answer 401 (support, homework, notices, marks, leaves, ...). Routes that already ran a permission check first were not affected
  - [x] Support tickets: a non-Super-Admin with no school is refused instead of seeing every school's tickets (5 support routes)
  - [x] Checked: no-cookie requests to support tickets, unread count, homework, subjects return 401
- [x] **P0-2 School and role come from the session only** (SEC-004)
  - [x] Super Admin "Manage this school" is now stored in that Super Admin's own session, not in a setting shared by everyone (no global school setting is left)
  - [x] School Admin / Principal / Teacher logins no longer change the global school (`app/actions/auth.js`)
  - [x] The global "current role" flag is gone: `getCurrentUser()` now reads the request's own session (`lib/currentUser.js`); `setCurrentRole` removed
  - [x] `resolveSchoolId()` refuses a request that has no session; Super Admin sessions and scripts keep their fallback (`lib/auth/schoolContext.js`)
  - [x] Checked: alternating Teacher and Admin requests each render their own dashboard (4 of 4), and `/dashboard` with no session redirects to login
- [x] **P0-3 Login added to the unprotected handlers** (API-002, API-003)
  - [x] Creating a school bootstraps its first session for the new school only (no shared setting changed)
  - [x] `POST /api/schools` needs a Super Admin
  - [x] Fee ledger `GET /api/fees/students/[id]/ledger`
  - [x] Razorpay `create-order`
  - [x] Razorpay `verify`
  - [x] Attendance by student
  - [x] Subjects `GET`
  - [x] Checked: 401 without a session; admin 200; teacher 403 on fees; parent 200 for own child and 403 for another child (28 of 28 checks passed)
- [x] **P0-4 Cron jobs fail closed and cover every school** (BIZ-001, OBS-003, OBS-004, OPS-002)
  - [x] Both cron routes reject when `CRON_SECRET` is missing or wrong (also `Bearer undefined`)
  - [x] Fee generation runs for every active school (each school resolved separately, one failing does not stop the others)
  - [x] Checked: without bearer 401; with the right bearer it processed 3 schools
  - [ ] **You still need to set `CRON_SECRET` in Vercel (production).** With the new code the crons stop working there until it is set
- [x] **P0-5 Upgrade `next` to the patched release** (SEC-008)
  - [x] `next` and `eslint-config-next` 16.3.2 -> 16.4.1, lockfile updated
  - [x] `npm audit`: critical 1 -> 0 (high 12 remain, all in dev tooling or transitive; Phase 1)
  - [x] Production build passes with 16.4.1 (`next build` exit 0); the 28 route checks and the Admin/Teacher page check were re-run on 16.4.1 and still pass

## Notes

- Checked for Manage-this-school: two Super Admin sessions on different schools each keep their own school (18 vs 17 subjects), manage without a session is refused, and creating a school puts its first academic session on the new school only (test school removed again).
- **`/setup` page** (school creation wizard) is still reachable without login; only its API call now needs a Super Admin. Closing the page itself is a small follow-up.
- `package.json` also gained `pusher` and `pusher-js` entries: the app already used them and they were in the lockfile, but not declared.
- The cron test ran the real jobs once against the local database: fee generation reported 50 existing Class 6 T1 fees as "updated" (re-synced), and the support cleanup job ran. Local data only.
- Old copies of `package.json` / `package-lock.json` are in the session scratchpad if a rollback is wanted.
