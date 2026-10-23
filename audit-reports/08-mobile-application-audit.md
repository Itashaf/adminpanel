# 08 — Mobile Application Audit (Expo / React Native, `schoolapp360`)

Auditor: A2. Scope: `C:\Users\Tashaf\Desktop\SchoolMS\schoolapp360` plus the backend routes it calls (`ADMIN/app/api/auth/*`, `notifications/register-token`, `lib/auth/jwt.js`, `lib/pushTokens.js`). Code-based; no build, install, test or device run. No sensitive file was opened.

## Method
- Listed the repo (104 files under `src/`, about 24.7k lines) and read in full: `src/api/baseApi.js`, `core/secureAuthStorage.js`, `core/store.js`, `core/sentry.js`, `App.js`, `core/navigation/RootNavigator.js`, `features/auth/{authSlice,authApi}.js`, `features/notifications/*`, `OfflineBanner.js` (top), relevant parts of `LoginScreen.js`, `ProfileScreen.js`, `ParentFeesScreen.js`, `feesReceipt.js`, `app.json`, `package.json`, `jest.config.js`, `jest.setup.js`, `.gitignore`, `.env.example` (names only). Greps over `src/` for logging, storage, linking, accessibility, tests.
- Docs (`README.md`, `ARCHITECTURE.md` etc.) were not reviewed in detail.
- Cross-checked backend: teacher login route (`app/api/auth/teacher/login/route.js`), JWT lifetime (`lib/auth/jwt.js:10`), `session.js` Bearer fallback (`:30-36`), push-token route and `lib/pushTokens.js`.

## Sensitive files (existence and git status only; contents NOT read)
| File | Exists | Git status | Holds secret material |
|---|---|---|---|
| `google-services.json` | yes | untracked, NOT ignored | Firebase client config (not a private key, but project identifiers) |
| `eas.json` | yes | untracked, NOT ignored | build/env config; treat as sensitive per audit rules |
| `*-firebase-adminsdk-*.json` | yes | ignored (`.gitignore:42`) | yes — Firebase service-account private key |
| `keystore-backup/` (contains a release keystore) | yes | ignored (`/keystore-backup`) | yes — Android signing key |
| `android/` (generated, incl. `sentry.properties`) | yes | ignored (`/android`) | may contain Sentry auth material (not opened) |
| `.env.local` | yes | ignored | env values (not opened) |

## Summary table
| ID | Sev | Conf | Title | Component |
|---|---|---|---|---|
| MOB-001 | P1 | High | Demo teacher/parent credentials hard-coded and shown in the production login screen | LoginScreen |
| MOB-002 | P2 | High | Real app is not under version control (only Expo template committed, no remote); config files untracked | repo / DevOps |
| MOB-003 | P2 | High | No 401/expired-token handling; logout does not clear RTK Query cache | baseApi, ProfileScreen |
| MOB-004 | P2 | High | Push token never unregistered on logout | usePushNotifications, backend |
| MOB-005 | P2 | Medium | Razorpay verify failure reported as "Payment failed" after money captured | ParentFeesScreen |
| MOB-006 | P3 | High | Silent `http://localhost:3000/api` fallback; login error reveals API URL | baseApi, LoginScreen |
| MOB-007 | P3 | High | Zero tests despite jest setup | testing |
| MOB-008 | P3 | High | No accessibility labels (0 `accessibilityLabel` vs 670 `TouchableOpacity`) | UI |
| MOB-009 | P3 | Medium | Offline handling is banner-only; no write queue for attendance/marks | offline |
| MOB-010 | P4 | High | Role/screen selection is client-side (AsyncStorage); backend enforces from JWT | auth |
| MOB-011 | P4 | Low | Generated manifest requests `RECORD_AUDIO`/`SYSTEM_ALERT_WINDOW` | android config |
| MOB-012 | P3 | Medium | Very large screen files (up to 1,061 lines), duplicated per-role patterns | maintainability |

## Findings

### MOB-001 — Demo credentials hard-coded and displayed in the production login screen
- **Category:** Mobile / Security   **Severity:** P1   **Confidence:** High   **Status:** Confirmed (bundle contents); exploitability depends on those accounts existing in the production DB
- **Affected component:** `src/features/auth/LoginScreen.js`
- **Evidence:** `LoginScreen.js:48-58` defines `TEST_CREDENTIALS` with a plaintext email+password literal for a seeded demo teacher and demo parent (values not reproduced); `:75` selects them; `:117-118` pre-fills the form; `:263` renders the "test credentials" panel with email and password in plain text. Nothing is gated by `__DEV__`.
- **Impact:** Every installed production build ships and displays working-looking credentials for named seed accounts. If those seed accounts exist in the production database (the web seed script creates them), anyone with the APK gets authenticated access to a school's teacher/parent data.
- **Reproduction / verification:** code-based; not executed. Whether production contains these accounts was not checked (no production access).
- **Root cause:** Developer convenience block left in release code.
- **Recommended fix:** Wrap in `__DEV__` (`const TEST_CREDENTIALS = __DEV__ ? {...} : {}`), delete the accounts from production, rotate their passwords.
- **Validation:** Release bundle contains no such strings; panel absent in a release build.
- **Effort:** S   **Dependencies:** none.

### MOB-002 — Real app is not under version control; config files untracked
- **Category:** DevOps / Mobile   **Severity:** P2   **Confidence:** High   **Status:** Confirmed
- **Affected component:** `schoolapp360` git repo
- **Evidence:** `git -C schoolapp360 log` has one commit ("Initial commit"), no remote; `git ls-files` lists only the Expo starter files (55) while `src/App.js`, all of `src/features`, `eas.json`, `google-services.json`, `plugins/` are untracked and the starter `src/app/*` files show as deleted. `.gitignore` comment says `google-services.json` "stays tracked" but it is untracked.
- **Impact:** Entire mobile source exists only on one machine (no backup/history/review); a careless `git add .` would stage `eas.json` and `google-services.json` (the service-account key and keystore are correctly ignored).
- **Reproduction / verification:** `git status`, `git ls-files`, `git remote -v`, `git check-ignore` (read-only).
- **Root cause:** Project scaffolded from the Expo template and never committed.
- **Recommended fix:** Commit the app (after deciding whether `eas.json` belongs in git — it normally does when it holds no secrets), add a private remote. Keep the adminsdk key and keystore out of the repo and back them up in a secret store.
- **Validation:** `git ls-files` shows `src/`; a fresh clone builds.
- **Effort:** S   **Dependencies:** none.

### MOB-003 — No 401/expired-token handling; logout leaves RTK Query cache
- **Category:** Mobile / Authentication   **Severity:** P2   **Confidence:** High   **Status:** Confirmed (code-based)
- **Affected component:** `src/api/baseApi.js`, `src/features/profile/ProfileScreen.js`, backend JWT
- **Evidence:** `baseApi.js` only attaches `Authorization` (`:6-14`) and retries GET on transient errors (`:25-37`); no branch handles `status === 401`. `grep logout|401|removeAuthToken` shows the only logout path is `ProfileScreen.js:62-70`, which clears the token, three AsyncStorage keys (including a `refresh_token` key that nothing ever sets) and dispatches `logout()`; there is no `baseApi.util.resetApiState()` (grep returns none). Server token lifetime is 7 days with no refresh (`ADMIN/lib/auth/jwt.js:10`).
- **Impact:** When the token expires or is invalid, every screen shows a generic load error and the user stays "logged in" until they manually log out. After a manual logout/login by a different user on the same device, cached queries (RTK `refetchOnMountOrArgChange: 30`, `baseApi.js:79`) from the previous account can be shown briefly until refetch.
- **Reproduction / verification:** code-based; not executed.
- **Root cause:** Minimal baseQuery; logout does not reset API state.
- **Recommended fix:** In `baseQuery`, if `result.error?.status === 401` then clear secure token/AsyncStorage and `api.dispatch(logout())`; in logout also `dispatch(baseApi.util.resetApiState())`.
- **Validation:** Use an expired token: app returns to login once; no stale data for a second user.
- **Effort:** S   **Dependencies:** MOB-004.

### MOB-004 — Push token is never unregistered on logout
- **Category:** Mobile / Privacy   **Severity:** P2   **Confidence:** High   **Status:** Confirmed (code-based)
- **Affected component:** `src/features/notifications/*`, `ADMIN/lib/pushTokens.js`, `app/api/notifications/register-token`
- **Evidence:** the app has a register mutation only (`pushTokenApi.js`); the backend has a single route `register-token` (no delete/unregister route; `deletePushToken` in `lib/pushTokens.js:46` is used for dead tokens). `registerPushToken` upserts by token (`lib/pushTokens.js:8-9`), so the token stays owned by the previous user until someone else signs in on that device.
- **Impact:** After logout (shared family/teacher device) notifications for the previous account (fee, exam result, notice content) continue to arrive on the device.
- **Reproduction / verification:** code-based; not executed.
- **Root cause:** No unregister endpoint/call.
- **Recommended fix:** Add `DELETE /api/notifications/register-token` (by token, caller must own it) and call it before clearing the auth token in `confirmLogout`.
- **Validation:** After logout, a test push to the old user is not delivered to that device.
- **Effort:** S   **Dependencies:** MOB-003.

### MOB-005 — Razorpay verify failure shown as "Payment failed" after capture
- **Category:** Mobile / Financial   **Severity:** P2   **Confidence:** Medium   **Status:** Confirmed (code-based)
- **Affected component:** `src/features/parent/ParentFeesScreen.js`
- **Evidence:** `:149-190` — checkout open then `verifyRazorpayPayment(...).unwrap()` inside one `try`; any error other than checkout code 0/2 shows `Alert 'Payment failed'`. The verify mutation is a POST and is (correctly) not auto-retried (`baseApi.js:30-36`). Pay buttons are disabled via `payingTermId` state (`:263,:378`), which is set before the async work.
- **Impact:** Network loss after a successful charge produces "Payment failed"; user may pay again. Combined with the missing webhook (FE-001) the fee is not recorded.
- **Reproduction / verification:** code-based; not executed.
- **Root cause:** No distinction between checkout failure and verify failure.
- **Recommended fix:** Track the checkout success; on verify failure show "Payment received, confirming with the school" and refetch Fees; fix server-side via webhook (FE-001).
- **Validation:** Force the verify call to fail after a test payment; message and eventual recording are correct.
- **Effort:** S   **Dependencies:** FE-001.

### MOB-006 — Silent localhost fallback; login error discloses API URL
- **Category:** Mobile / Configuration   **Severity:** P3   **Confidence:** High   **Status:** Confirmed
- **Affected component:** `src/api/baseApi.js:3`, `LoginScreen.js:~106-112`
- **Evidence:** `API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api'`; on `FETCH_ERROR` the login screen tells the user to "check that the backend is running" and prints the configured URL. `eas.json` defines `EXPO_PUBLIC_API_URL` per build profile (names only inspected via key listing, values not read). Only four `EXPO_PUBLIC_*` vars are used: API URL, Sentry DSN, crash-reporting flag, Razorpay key id (all public by design).
- **Impact:** A release build missing the variable silently targets localhost (all requests fail); developer-oriented error text shown to end users.
- **Reproduction / verification:** code-based.
- **Root cause:** Dev defaults in production code path.
- **Recommended fix:** Fail loudly if unset outside `__DEV__`; show generic user message.
- **Validation:** Release build without the var surfaces a clear config error in logs.
- **Effort:** S   **Dependencies:** none.

### MOB-007 — No tests
- **Category:** Mobile / Testing   **Severity:** P3   **Confidence:** High   **Status:** Confirmed
- **Evidence:** `jest.config.js` and `jest.setup.js` exist; `find src -name '*.test.*'` and `__tests__` return nothing. `npm test` not run (no network/build allowed). Lint script targets `src --ext .js,.jsx`.
- **Impact:** Auth, payment and attendance flows have no regression protection.
- **Recommended fix:** Start with baseQuery 401 handling and the fee/receipt helpers (`feesFormat.js`, `feesReceipt.js`).
- **Reproduction / verification:** file search only; tests not run.
- **Root cause:** Test scaffolding added but no tests written.
- **Validation:** `npm test` runs real tests locally.
- **Effort:** M   **Dependencies:** none.

### MOB-008 — No accessibility labels
- **Category:** Mobile / UX   **Severity:** P3   **Confidence:** High   **Status:** Confirmed (grep-based, not device tested)
- **Evidence:** `grep -rn accessibilityLabel src` returns 0; 670 `TouchableOpacity` uses.
- **Impact:** Icon-only buttons are unusable with TalkBack/VoiceOver.
- **Recommended fix:** Add `accessibilityRole`/`accessibilityLabel` to shared `Button`, header back/close and tab icons first.
- **Effort:** M   **Dependencies:** none.

### MOB-009 — Offline behaviour is banner-only
- **Category:** Mobile / Reliability   **Severity:** P3   **Confidence:** Medium   **Status:** Confirmed (code-based)
- **Evidence:** `OfflineBanner.js` (NetInfo listener, `isConnected`/`isInternetReachable`) is the only offline feature; no persisted RTK cache or write queue (no redux-persist in `package.json`). GETs retry twice on FETCH_ERROR/TIMEOUT/5xx; mutations never retry (`baseApi.js:25-37`, deliberate and good).
- **Impact:** A teacher marking attendance or entering marks on poor connectivity gets an error and must re-enter; no draft is saved.
- **Recommended fix:** Keep unsent attendance/marks drafts in local state until save succeeds (verify per screen), or persist drafts in AsyncStorage.
- **Effort:** M   **Dependencies:** none.

### MOB-010 — Client-side role selection (informational; backend enforces)
- **Category:** Mobile / Authorization   **Severity:** P4   **Confidence:** High   **Status:** Confirmed (no defect found)
- **Evidence:** `AppNavigator.js:282-285` chooses Teacher or Parent tabs from `state.auth.userRole`, rehydrated from plain AsyncStorage `user_role` (`App.js:46-56`). Login trusts the response role (`authApi.js:34`, staff uses backend `roleKey`). Backend: `app/api/auth/teacher/login/route.js` signs the role into the JWT after credential validation with rate limiting; `lib/auth/session.js:30-36` reads the Bearer token; the register-token route uses `getCurrentUserInfo()` from the token (`app/api/notifications/register-token/route.js`).
- **Impact:** On a rooted device a user could edit `user_role` to see another role's screens, but every API call is authorised from the JWT. Per-endpoint authorization for all roles used by the app (`/exams`, `/attendance`, `/fees`, `/assessments`, `/students` and so on) was NOT verified here (backend auditors).
- **Recommended fix:** None required; keep authorization server-side. `user_data` in plain AsyncStorage is display-only (JWT is in SecureStore on native, `secureAuthStorage.js`; web fallback is AsyncStorage by design).
- **Effort:** n/a   **Dependencies:** none.

### MOB-011 — Generated manifest requests extra permissions
- **Category:** Mobile / Privacy   **Severity:** P4   **Confidence:** Low   **Status:** Suspected
- **Evidence:** `android/app/src/main/AndroidManifest.xml:4-5` lists `RECORD_AUDIO` and `SYSTEM_ALERT_WINDOW`; `app.json` declares neither, and `/android` is git-ignored (regenerated by prebuild/EAS), so the release manifest was not verified. `SYSTEM_ALERT_WINDOW` usually comes from dev-client debug builds.
- **Impact:** If present in a release build, over-broad permissions (Play review, user trust).
- **Recommended fix:** Add `android.blockedPermissions` in `app.json` for those two and inspect the release AAB manifest.
- **Effort:** S   **Dependencies:** none.

### MOB-012 — Very large screen files
- **Category:** Mobile / Maintainability   **Severity:** P3   **Confidence:** Medium   **Status:** Confirmed
- **Evidence:** `ParentCalendarScreen.js` 1,061 lines, `EnterMarksScreen.js` 1,039, `DailyAttendanceScreen.js` 1,008, `ParentAttendanceScreen.js` 895, `TeacherDashboardScreen.js` 822.
- **Impact:** Hard to test/review; style blocks mixed with logic.
- **Recommended fix:** Split when touched; no rewrite.
- **Effort:** L   **Dependencies:** MOB-007.

## Positive observations
- JWT stored via `expo-secure-store` on native with a documented web fallback (`secureAuthStorage.js`).
- Retry policy is idempotent-only: GET on transient errors, never on mutations (`baseApi.js:25-37`); 30 s timeout set.
- Dev-only request/response logging gated by `__DEV__` (`baseApi.js:44-58`); push logs also `__DEV__`-gated.
- Sentry enabled only with env flag + DSN, disabled in `__DEV__`; React error boundary with fallback (`App.js`). No `sendDefaultPii`.
- Offline banner via NetInfo; push permissions requested only after login; receipt HTML for `expo-print` escapes values (`feesReceipt.js`, `esc(...)` on interpolated fields).
- Razorpay: amount and order come from the server; app only holds the public key id.
- Service-account key and release keystore are git-ignored; `app.json` has a unique `android.package`.
- Server enforces auth from JWT; teacher login is rate limited.

## Limitations / not assessed
- No device/emulator run, no build, no `npm test`/`npm audit` for the mobile project (not permitted/needed for audit); dependency vulnerabilities not assessed.
- Contents of `eas.json`, `google-services.json`, adminsdk JSON, keystore, `sentry.properties`, `.env.local` deliberately not read; `eas.json` secrets/profile separation (API URL per environment) therefore not verified beyond key names.
- Deep-link configuration: only the `schoolapp360` scheme in `app.json`; `NavigationContainer` has no `linking` config and notification taps just navigate to the Notifications screen (no deep-link exposure found). iOS/Play store build config, OTA updates (`expo-updates` is not installed) and certificate pinning not assessed.
- Per-endpoint backend authorization for mobile routes not verified (see MOB-010); screens other than auth, fees and push were skimmed by grep only.
