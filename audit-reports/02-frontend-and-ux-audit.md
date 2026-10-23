# 02 — Frontend Engineering and UI/UX Audit (Admin web app)

Auditor: A2. Scope: ADMIN `components/` (283 .jsx), `app/**/page.jsx` (70), layouts, loading/error files, `lib/api.js`, `lib/hooks/*`. Code-based review; **no visual/browser testing was performed** — all UX findings are "code-based, not visually verified".

## Method
- Listed route groups and loading/error/not-found files (glob). Ran `npx eslint components app` (read-only, JSON output) and extracted rule counts.
- Grepped all of `app/ components/ lib/` for `dangerouslySetInnerHTML`, `innerHTML`, `document.write`, `window.open`, `router.push(<data>)`, `localStorage`, `NEXT_PUBLIC_*`, `AbortController`, `router.refresh`, `aria-*`.
- Read in full: `components/Modal.jsx`, `lib/hooks/useUrlSync.js`, `lib/hooks/usePagedResult.js`, `components/fees/RazorpayPayButton.jsx` (payment path), `components/fees/CollectFeeModal.jsx`, `printReportCard.js`; large parts of `StudentFeeDetailPanel.jsx`, `printMonthlyReport.js`; head of `lib/api.js`, `PageLoader.jsx`, DropdownMenu/Dropdown (top), Sidebar mobile classes. Everything else was sampled by grep only (about 15 of 283 components read in depth).

## Summary table
| ID | Sev | Conf | Title | Component |
|---|---|---|---|---|
| FE-001 | P1 | Medium | Online-payment finalisation depends only on the browser callback; no Razorpay webhook route | fees / Razorpay |
| FE-002 | P2 | High | No `error.jsx` / `global-error.jsx` anywhere in the App Router tree | app routing |
| FE-003 | P2 | High | `npx eslint` reports 55 errors incl. 47 `set-state-in-effect` | many components |
| FE-004 | P2 | Medium | No global 401/expired-session handling in the client fetch layer | lib/api.js, explorers |
| UX-001 | P2 | High | Modal has no dialog semantics, focus trap or accessible close; backdrop click discards forms | Modal.jsx |
| UX-002 | P3 | High | Custom dropdowns/menus: no keyboard or ARIA support; 2 `aria-label`s in the whole UI | Dropdown, DropdownMenu |
| UX-003 | P3 | High | Mixed loaders: 11 route `loading.jsx` use full-screen `PageLoader` vs shimmer skeletons | loading.jsx |
| UX-004 | P3 | Medium | Unsaved-changes protection exists in one screen only | forms |
| UX-005 | P3 | Medium | Pagination pattern inconsistent (fixed bottom bar vs inline, hand-copied bars) | list pages |
| FE-005 | P3 | High | Duplicate uncached server fetch in `generateMetadata` + page | sections/[sectionId], exams/[id]/verify |
| FE-006 | P3 | Medium | Filter change may trigger RSC refetch and client fetch; 43 files call `router.refresh()` | useUrlSync, explorers |
| FE-007 | P3 | Medium | No request cancellation (`AbortController` in 0 files) | components |
| FE-008 | P4 | High | Notification `link` passed straight to `router.push` | NotificationBell, ParentTopbar |
| FE-009 | P3 | Medium | Very large components (1,023 / 739 / 737 / 687 / 680 lines) | maintainability |

## Findings

### FE-001 — Online-payment finalisation depends only on the browser callback; no Razorpay webhook route
- **Category:** Frontend / Backend   **Severity:** P1   **Confidence:** Medium   **Status:** Confirmed (missing control); consequence is code-based
- **Affected component:** Fee payment via Razorpay (web `RazorpayPayButton`, mobile `ParentFeesScreen`)
- **Evidence:** `components/fees/RazorpayPayButton.jsx:63-80` — the payment is recorded only inside Razorpay's `handler`, which calls `verifyRazorpayPayment`; on failure it only shows `err.message`. `find app/api -ipath '*webhook*'` returns nothing and no file references `x-razorpay-signature`. Mobile `schoolapp360/src/features/parent/ParentFeesScreen.js:149-190` uses the same pattern; a verify failure is shown as "Payment failed" even though Razorpay has already captured the money.
- **Impact:** If the parent closes the tab/app, loses network or the verify call 5xx's after the card is charged, money is captured but the fee stays unpaid in the system; reconciliation is manual and the parent, told "failed", may pay twice.
- **Reproduction / verification:** code-based; not executed. Server-side idempotency of create-order/verify not reviewed here (backend auditor).
- **Root cause:** No server-to-server confirmation path (`payment.captured` webhook) and no client "confirming" recovery state.
- **Recommended fix:** Add `app/api/payments/razorpay/webhook/route.js` that verifies the webhook signature on the raw body and records the payment idempotently using the same function as verify. On client verify failure show "Payment may have been received — do not pay again; refresh in a minute".
- **Validation:** Simulate verify failure after a test-mode payment; the webhook still marks the fee paid exactly once.
- **Effort:** M   **Dependencies:** MOB-005; backend auditor's payment findings.

### FE-002 — No `error.jsx` / `global-error.jsx` anywhere
- **Category:** Frontend   **Severity:** P2   **Confidence:** High   **Status:** Confirmed
- **Affected component:** All route groups (`/dashboard`, `/parent`, `/super-admin`, auth pages, `/setup`)
- **Evidence:** `find app -name error.jsx -o -name global-error.jsx` returns nothing; only `app/not-found.jsx` exists. Most dashboard pages are async Server Components that call DB-backed lib functions directly (e.g. `app/dashboard/classes/page.jsx:12-19`).
- **Impact:** Any thrown DB/lib error during server render shows Next's generic error screen with no in-app navigation or retry.
- **Reproduction / verification:** code-based (file listing); not executed.
- **Root cause:** Only `loading.jsx` was rolled out; error boundaries never added.
- **Recommended fix:** Add `app/dashboard/error.jsx`, `app/parent/error.jsx`, `app/super-admin/error.jsx` and `app/global-error.jsx` (client components with a `reset()` button, no error text shown). Check `node_modules/next/dist/docs/` for this Next version's conventions first.
- **Validation:** Temporarily throw in one page in dev; boundary renders with Retry.
- **Effort:** S   **Dependencies:** none.
- Loading coverage: `dashboard/loading.jsx`, `parent/loading.jsx`, `super-admin/loading.jsx` exist as group fallbacks plus about 40 per-route files; `login`, `forgot-password`, `set-password`, `setup` have none (acceptable).

### FE-003 — ESLint reports 55 errors, 47 of them `react-hooks/set-state-in-effect`
- **Category:** Frontend   **Severity:** P2   **Confidence:** High   **Status:** Confirmed (ran `npx eslint components app`)
- **Affected component:** files below
- **Evidence:** rule counts — `set-state-in-effect` 47 (E), `purity` 4 (E), `immutability` 1 (E), `preserve-manual-memoization` 1 (E), `no-html-link-for-pages` 2 (E), `react/no-unescaped-entities` 42 (E), `no-img-element` 17 (W), `incompatible-library` 13 (W). set-state-in-effect sites (file:line): academics/SubjectFormModal:22, TimeTableClient:174,215, TimeTablePeriodModal:25; attendance/DailyAttendanceBoard:145, RemarkModal:13; classes/AssignClassTeacherModal:33, AssignSectionTeacherModal:29, SectionFormModal:44, SubjectsModal:17; dashboard/NotificationBell:52, TeacherNotificationBell:69; exams/EffectiveResultModal:15, ExamAuditLogModal:53, ExamEnrollmentModal:18, ExamVerificationClient:98, PrintMarksheetClient:38; fees/CollectFeeModal:44, DiscountModal:50, FeeStructureFormModal:437, GenerateFeesModal:22, PaymentLedgerModal:29, PaymentsExplorer:38, StandingDiscountModal:47, StudentFeeDetailPanel:180,201, StudentFeesExplorer:165; marksEntry/MarksEntryClient:22,38,48, MarksEntrySheet:68,90; parent/ParentFeesView:22, ParentTopbar:83; performance/BulkImportModal:64, MonthlyDashboardExplorer:72, SubjectTestsExplorer:50, YearlyDashboardExplorer:78; students/PromoteStudentsExplorer:82, SetPortalAccessDialog:30, StudentAttendanceTab:130, StudentFeesTab:33; superadmin/AdminPermissionsModal:17, CreateAdminModal:26, EditSchoolModal:42, ResetPasswordDialog:15; teachers/ResetPasswordDialog:16.
- **Impact:** Extra render passes and possible flicker (modals reset form state in an effect after open, e.g. `CollectFeeModal.jsx:44`); the lint baseline is red and there is no CI to gate it. Mostly maintainability/perf, not a demonstrated correctness bug.
- **Reproduction / verification:** `npx eslint components app` (read-only).
- **Root cause:** "Reset on open" done with `useEffect`+setState rather than remounting the form with a `key` or deriving state.
- **Recommended fix:** Render modal bodies only while open with `key={fee.id}` so state initialises from props; fix the 4 `purity` errors (impure calls in render) first.
- **Validation:** eslint error count falls; modals behave the same.
- **Effort:** M   **Dependencies:** none.

### FE-004 — No global 401/expired-session handling in the client fetch layer
- **Category:** Frontend   **Severity:** P2   **Confidence:** Medium   **Status:** Suspected
- **Affected component:** `lib/api.js` and ad-hoc `fetch` callers
- **Evidence:** `lib/api.js` helpers follow `if (!res.ok) { throw new Error(error.error || '...') }` (e.g. lines 1-50) with no status inspection; grep for `401` under `components/`, `lib/api.js`, `lib/hooks`, non-API `app/` finds only comments. Middleware behaviour for expired sessions on API calls was not assessed.
- **Impact:** After the session JWT expires (or a role is revoked) mid-session each action shows a generic "Failed to ..." message instead of redirecting to login.
- **Reproduction / verification:** code-based; not executed.
- **Root cause:** Each helper re-implements error handling; there is no shared `apiFetch`.
- **Recommended fix:** Small `apiFetch(url, opts)` wrapper: on 401 `window.location.assign('/login')`, on 403 throw a "no permission" error; helpers call it.
- **Validation:** Delete the cookie in dev and click an action; redirected to login once.
- **Effort:** M   **Dependencies:** none.

### UX-001 — Modal lacks dialog semantics and focus management; backdrop click discards forms
- **Category:** UX / accessibility   **Severity:** P2   **Confidence:** High   **Status:** Confirmed (code-based, not visually verified)
- **Affected component:** `components/Modal.jsx` (used by nearly all form modals)
- **Evidence:** `Modal.jsx:27` Escape closes; `:37` backdrop `onClick={onClose}`; `:56-58` close button is icon-only with no `aria-label`; no `role="dialog"`/`aria-modal`/focus trap (`grep aria-modal|role="dialog" components` returns 0). Escape/backdrop also close while a submit is in flight.
- **Impact:** Keyboard and screen-reader users cannot use modals reliably; an accidental backdrop click on a long form loses all input.
- **Reproduction / verification:** code-based; not executed.
- **Root cause:** Minimal shared modal.
- **Recommended fix:** `role="dialog" aria-modal="true" aria-labelledby`, `aria-label="Close"` on the X, focus first field on open and restore on close, optional `dismissOnBackdrop={false}` for forms (or native `<dialog>.showModal()`, which provides focus trap and Escape).
- **Validation:** Tab cycles within the modal; a screen reader announces the title.
- **Effort:** S   **Dependencies:** none.

### UX-002 — Custom dropdowns/menus have no keyboard or ARIA support
- **Category:** UX / accessibility   **Severity:** P3   **Confidence:** High   **Status:** Confirmed (code-based)
- **Affected component:** `components/Dropdown.jsx`, `components/DropdownMenu.jsx`
- **Evidence:** both open on click and close on outside `mousedown`; no `onKeyDown`, `role=listbox/menu`, `aria-expanded` (DropdownMenu.jsx fully read to line 60, Dropdown.jsx partly). Across `components/` and `app/` only 3 files contain any `aria-` attribute and there are 2 `aria-label`s against 289 `<button` occurrences (many icon-only).
- **Impact:** Keyboard-only and assistive-tech users cannot operate class/section/status selectors in core workflows.
- **Reproduction / verification:** code-based; not executed.
- **Root cause:** Hand-rolled portal widgets without an a11y pass.
- **Recommended fix:** Add Arrow/Enter/Escape handling and `aria-haspopup`/`aria-expanded`; `aria-label` on icon buttons; use native `<select>` for simple lists.
- **Validation:** Operate the dropdowns with keyboard only.
- **Effort:** M   **Dependencies:** UX-001.

### UX-003 — Loader inconsistency: PageLoader spinner vs shimmer skeletons
- **Category:** UX   **Severity:** P3   **Confidence:** High   **Status:** Confirmed
- **Affected component:** route `loading.jsx` files
- **Evidence:** `components/PageLoader.jsx` (full-screen fixed overlay spinner) is used by `app/dashboard/academics/{calendar,subjects,timetable}/loading.jsx`, `attendance/loading.jsx`, `exams/[id]/loading.jsx`, `fees/loading.jsx`, `leave/loading.jsx`, `dashboard/loading.jsx`, `profile/loading.jsx`, `settings/loading.jsx`, `app/super-admin/loading.jsx`. Redesigned areas (parent portal, classes/homework/notices/sessions) use skeletons per PageLoader's own header comment.
- **Impact:** Visible jump between spinner overlay and layout-matching skeletons; `dashboard/loading.jsx` is also the fallback for any dashboard route without its own file.
- **Reproduction / verification:** code-based, not visually verified.
- **Root cause:** Redesign rolled out incrementally.
- **Recommended fix:** Convert to skeleton loading files, starting with dashboard home, fees, attendance.
- **Validation:** Navigate between those routes; consistent placeholders.
- **Effort:** M   **Dependencies:** none.

### UX-004 — Unsaved-changes protection only in the timetable editor
- **Category:** UX   **Severity:** P3   **Confidence:** Medium   **Status:** Confirmed (grep-based)
- **Affected component:** marks entry, attendance, long forms
- **Evidence:** `components/academics/TimeTableClient.jsx:196,220` (`isDirty` + `window.confirm`). `grep unsaved|beforeunload` finds nothing else; attendance `isDirty` only enables buttons (`AttendanceActionBar.jsx:19`). `MarksEntrySheet`, `StudentForm` (737 lines), `TeacherForm` (680) have no leave-guard.
- **Impact:** Teachers lose entered marks/attendance on accidental navigation or refresh.
- **Reproduction / verification:** code-based; not executed.
- **Root cause:** Not implemented outside one screen.
- **Recommended fix:** Small `useBeforeUnload(isDirty)` hook for marks entry and attendance.
- **Validation:** Edit, then refresh: browser prompts.
- **Effort:** S   **Dependencies:** UX-001.

### UX-005 — Pagination pattern inconsistent
- **Category:** UX   **Severity:** P3   **Confidence:** Medium   **Status:** Confirmed (code-based)
- **Affected component:** list pages
- **Evidence:** `FixedPaginationBar.jsx:16` (fixed bottom, `lg:left-64`) is used by Subjects, Calendar, Classes, Exams, Payments, Homework, Notices and the parent lists; the same bar is hand-copied in `ExamDetailsClient.jsx:232`, `StaffAttendanceBoard.jsx:388`, `MarksEntrySheet.jsx:479` (z-20 vs z-30), while `Pagination.jsx` is inline.
- **Impact:** Inconsistent look; stacked bars can overlap content on small screens (not visually verified).
- **Reproduction / verification:** code-based.
- **Root cause:** Pattern copied rather than shared.
- **Recommended fix:** One shared fixed bar component; drop copies.
- **Validation:** Visual check at phone width.
- **Effort:** S   **Dependencies:** none.

### FE-005 — Duplicate uncached server fetch in `generateMetadata` and the page
- **Category:** Frontend / Performance   **Severity:** P3   **Confidence:** High   **Status:** Confirmed (code-based)
- **Affected component:** `app/dashboard/classes/[id]/sections/[sectionId]/page.jsx`, `app/dashboard/exams/[id]/verify/page.jsx`
- **Evidence:** section page calls `getSectionDetail` at `:10` and `:19`; verify page calls `getExamById` at `:8` and `:15`. `lib/classes.js:223` and `lib/exams.js:156` are not wrapped in React `cache()`.
- **Impact:** Doubled DB query per navigation on these routes.
- **Reproduction / verification:** code-based.
- **Root cause:** Same getter used by metadata and render without memoisation.
- **Recommended fix:** Wrap the two getters with `cache` from `react`.
- **Validation:** One query per request in DB logs.
- **Effort:** S   **Dependencies:** none.

### FE-006 — Possible double fetching on filter change; heavy `router.refresh()` use
- **Category:** Frontend / Performance   **Severity:** P3   **Confidence:** Medium   **Status:** Suspected
- **Affected component:** `lib/hooks/useUrlSync.js`, `usePagedResult.js`, explorers
- **Evidence:** `useUrlSync.js:24-33` does debounced (300 ms) `router.replace` on each change, which re-renders the server page (RSC refetch); `usePagedResult.js:36-52` separately calls client `fetchPage()` for the same key. 43 files call `router.refresh()`.
- **Impact:** Two DB round-trips per filter change on Homework/Notices-style explorers.
- **Reproduction / verification:** code-based; confirm in the browser Network tab.
- **Root cause:** URL sync and client fetching both active.
- **Recommended fix:** Pick one source of data per explorer (client fetch + `history.replaceState`, or server only).
- **Validation:** One request per filter change.
- **Effort:** M   **Dependencies:** none.

### FE-007 — No request cancellation
- **Category:** Frontend   **Severity:** P3   **Confidence:** Medium   **Status:** Confirmed
- **Affected component:** client components that fetch
- **Evidence:** `AbortController` appears in 0 files under `components/ app/ lib/`. `usePagedResult.js:41-52` guards with a `cancelled` flag (stale results cannot overwrite). Other effects were not individually audited.
- **Impact:** Wasted requests; possible stale overwrites where no flag exists (not enumerated).
- **Reproduction / verification:** grep-based.
- **Root cause:** Not part of the fetch helpers.
- **Recommended fix:** Optional `signal` argument in `lib/api.js` helpers where effects call them.
- **Validation:** Rapid filter switching leaves latest result.
- **Effort:** S-M   **Dependencies:** FE-004.

### FE-008 — Notification `link` passed to `router.push`
- **Category:** Frontend security   **Severity:** P4   **Confidence:** High   **Status:** Confirmed (low risk)
- **Affected component:** `components/dashboard/NotificationBell.jsx:102`, `components/parent/ParentTopbar.jsx:102`
- **Evidence:** `router.push(item.link)`. Links are server-generated internal paths (`lib/examMarks.js:269`, `lib/notices.js:551`, `lib/support.js:194`); no user-controlled source of `link` was found. `TeacherNotificationBell.jsx` maps links to web routes instead of trusting them.
- **Impact:** None demonstrated; would matter only if a future writer stores an external URL.
- **Reproduction / verification:** code-based.
- **Root cause:** No client-side validation of the stored link.
- **Recommended fix:** Guard with `link.startsWith('/') && !link.startsWith('//')`.
- **Validation:** External link ignored.
- **Effort:** S   **Dependencies:** none.

### FE-009 — Very large components
- **Category:** Maintainability   **Severity:** P3   **Confidence:** Medium   **Status:** Confirmed
- **Affected component:** `TimeTableClient.jsx` 1,023 lines, `RolesPermissionsExplorer.jsx` 739, `StudentForm.jsx` 737, `FeeStructureFormModal.jsx` 687, `TeacherForm.jsx` 680
- **Evidence:** `wc -l` on components.
- **Impact:** Hard to review; contributes to the effect-state issues (FE-003).
- **Reproduction / verification:** `wc -l`.
- **Root cause:** Organic growth.
- **Recommended fix:** Split opportunistically when touched; no big-bang refactor.
- **Validation:** n/a.
- **Effort:** L   **Dependencies:** FE-003.

## Workflow review (structure-level, not executed)
- Add student: one 737-line `StudentForm`, no leave-guard (UX-004).
- Record attendance: `DailyAttendanceBoard` + sticky `AttendanceActionBar` (Save disabled unless dirty).
- Enter marks: `MarksEntryClient`/`MarksEntrySheet` with 5 setState-in-effect sites and a fixed bottom bar.
- Collect fees: `CollectFeeModal` uses react-hook-form `isSubmitting` to disable submit; client amount cap plus (presumably) server check. Razorpay button disables via `isProcessing`; see FE-001 for the post-payment gap.
- Publish results, send notice, assign teacher: shared Modal (UX-001). Excess steps/confusing forms were not measured.

## Frontend security observations
- No `dangerouslySetInnerHTML`/`innerHTML`; no `localStorage`/`sessionStorage` use; `NEXT_PUBLIC_*` names are `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER` (non-secret by design).
- Print/receipt HTML via `win.document.write` (`printReportCard.js:51`, `StudentFeeDetailPanel.jsx:43`, `printMonthlyReport.js:224,254`, `printYearlyReport.js:251,276`): user-derived strings pass through `escapeHtml` (escapes `& < > " '`); remaining unescaped interpolations are numeric fields. Print windows load Google Fonts (minor privacy note).
- Sampled server pages call `blockIfAccountant()/blockIfTeacher()` (e.g. `classes/page.jsx:12`), so access is not purely hidden-button; API enforcement belongs to other auditors.

## Positive observations
- Consistent HTML escaping in all four print generators; no HTML sinks.
- `usePagedResult` discards stale responses and handles last-page deletion.
- Forms use `isSubmitting`; sticky action bars disable while saving.
- Skeleton `loading.jsx` on the parent portal and redesigned lists; mobile sidebar is an overlay drawer with `lg:` breakpoints (`Sidebar.jsx:415-422`); charts set `responsive: true, maintainAspectRatio: false`.
- `app/not-found.jsx` present.

## Limitations / not assessed
- No browser or visual testing: contrast, touch-target size, table overflow on phones, chart rendering were not assessed beyond class names.
- About 15 of 283 components read in full. Not exhaustively reviewed: per-effect race analysis of the 47 flagged effects, necessity of `"use client"` (189 of 283 component files are client components), serialisation of large server data into client props, and Suspense wrapping for each of the 20 `useSearchParams` users.
- Server data-fetch waterfalls: 10 pages with 3+ awaits and no `Promise.all` were seen; those inspected were dependent chains (auth, record, list), so only duplicate fetches are reported.
