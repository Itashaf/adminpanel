# 10 — DevOps and Production Readiness (A1)

## Scope / Method / Verified vs read
Env config, CI/CD, deploy config, migrations, secrets handling, logging/monitoring, health, backups/DR, debug exposure, mobile build config. Method: file reads, `git ls-files`, `git check-ignore`, grep for `process.env`. Env variable NAMES only; no values read or printed. All code-based; nothing deployed or executed.

## Summary table
| ID | Sev | Conf | Title | Component |
|---|---|---|---|---|
| OPS-001 | P1 | High | No CI/CD: no lint/test/build gate before deploy | repo |
| OPS-002 | P2 | High | Cron endpoints fail open when CRON_SECRET is unset | app/api/cron |
| OPS-003 | P2 | High | No env validation; no `.env.example` for ADMIN; localhost URL fallback | config |
| OPS-004 | P2 | High | No error tracking, structured logging or health endpoint in ADMIN | observability |
| OPS-005 | P2 | Medium | Migrations manual, single baseline migration, no backup/DR evidence | database ops |
| OPS-006 | P2 | Medium | Login rate limiter is per-instance in-memory | lib/auth |
| OPS-007 | P3 | High | No security headers / empty next.config | next.config.mjs |
| OPS-008 | P3 | High | `dev.log`, PDFs and scratch scripts tracked in git | repo hygiene |
| OPS-009 | P2 | Medium | Mobile release assets (eas.json, keystore, firebase files) exist only locally | schoolapp360 |

## Evidence summary
- **Git tracking of secrets:** ADMIN `.env` exists and is NOT tracked (`git ls-files .env` empty; `.gitignore` has `.env*`). MOBILE: `.env.local`, `keystore-backup/`, `*firebase-adminsdk*.json` are gitignored (`.gitignore:34,54,42`); `eas.json` and `google-services.json` exist but are not in `git ls-files` (the repo tracks only the Expo template, MOB-002). Presence only; contents not read.
- **ADMIN env var names (from code):** DATABASE_URL (schema.prisma:20), JWT_SECRET, ENCRYPTION_KEY, CRON_SECRET, SMTP_HOST/PORT/USER/PASS/FROM/SECURE, R2_ACCOUNT_ID/ACCESS_KEY_ID/SECRET_ACCESS_KEY/BUCKET_NAME/PUBLIC_URL, PUSHER_APP_ID/KEY/SECRET/CLUSTER, NEXT_PUBLIC_PUSHER_KEY/CLUSTER, NEXT_PUBLIC_APP_URL, SUPER_ADMIN_SEED_PASSWORD, NODE_ENV. The local `.env` defines every one except CRON_SECRET and SUPER_ADMIN_SEED_PASSWORD (names compared only).
- **Per-school Razorpay secrets** are stored encrypted (`lib/auth/encryption.js`, 32-byte hex ENCRYPTION_KEY): good pattern; no key rotation support.
- **CI/CD:** no `.github/` or other CI files in either repo. Deploy is Vercel (inferred from `vercel.json`: region syd1, 2 crons). `next.config.mjs` is empty. No Dockerfile. `build` = `prisma generate && next build`.
- **Mobile build:** `eas.json` has development/preview/production profiles + submit; `app.json` package `com.tashafm.schoolapp360`, Sentry plugin, `googleServicesFile` reference. Manifest permission note: MOB-011.
- **Debug exposure:** no health/debug routes under `app/api` (33 route groups listed). No backup/DR/restore evidence in either repo ("no evidence").
- **HTTPS/CORS:** no CORS handling in `app/api`; mobile calls are bearer-token, not browser, so CORS is not required. HTTPS is provided by Vercel; not verified.

## Findings
### OPS-001 — No CI/CD gates
- **Category:** DevOps
- **Severity:** P1   **Confidence:** High   **Status:** Confirmed
- **Affected component:** both repos
- **Evidence:** no `.github/` in ADMIN or MOBILE; `package.json:5-11`; lint currently exits 1 (TST-003) and there are no tests (TST-001)
- **Impact:** broken or insecure code deploys unchecked; with about 100 uncommitted modified files, release provenance is unclear.
- **Reproduction / verification:** code-based
- **Root cause:** pipeline never set up
- **Recommended fix:** minimal GitHub Actions: `npm ci`, `npm run lint`, `prisma validate`, `next build` with dummy env, plus tests once present; protect main.
- **Validation:** a PR with a lint error is blocked
- **Effort:** S   **Dependencies:** TST-001, TST-003

### OPS-002 — Cron endpoints fail open without CRON_SECRET
- **Category:** Security
- **Severity:** P2   **Confidence:** High   **Status:** Confirmed (code-based; production env not checked)
- **Affected component:** app/api/cron/*
- **Evidence:** `app/api/cron/generate-fees/route.js:13`, `app/api/cron/cleanup-support-tickets/route.js:9` — the bearer check only runs when the variable is set
- **Impact:** if CRON_SECRET is missing in production (it is absent from the local `.env`), anyone can trigger mass fee generation or ticket cleanup.
- **Reproduction / verification:** code-based; cron routes not requested per audit rules
- **Root cause:** `process.env.CRON_SECRET && header !== ...` short-circuits when unset
- **Recommended fix:** `const s = process.env.CRON_SECRET; if (!s || authHeader !== 'Bearer ' + s) return 401;`
- **Validation:** unauthenticated request returns 401 with and without the var (local only)
- **Effort:** S   **Dependencies:** none

### OPS-003 — No env validation, no ADMIN `.env.example`
- **Category:** DevOps
- **Severity:** P2   **Confidence:** High   **Status:** Confirmed
- **Affected component:** configuration
- **Evidence:** `lib/auth/jwt.js:4-7` and `lib/auth/encryption.js:13-15` throw lazily at first use; `lib/teachers.js:10` silently falls back to `http://localhost:3000` for generated links; `.env.example` absent in ADMIN (MOBILE has one)
- **Impact:** a misconfigured deploy boots, then fails on first login/payment or emails localhost links to users.
- **Reproduction / verification:** code-based
- **Root cause:** no startup config check
- **Recommended fix:** one `lib/env.js` checking required names at startup (via `instrumentation.js`) and a committed `.env.example` with names only.
- **Validation:** booting with a var removed fails fast
- **Effort:** S   **Dependencies:** OPS-002

### OPS-004 — No error tracking, structured logging or health endpoint (ADMIN)
- **Category:** DevOps
- **Severity:** P2   **Confidence:** High   **Status:** Confirmed
- **Affected component:** observability
- **Evidence:** no Sentry/pino in ADMIN deps (`package.json:13-45`); 30 `console.*` calls in app/lib; no `app/api/health`; Sentry only in MOBILE. Logging detail: see 11-observability-and-privacy-audit.md
- **Impact:** production API errors and failed crons are visible only in Vercel logs; no uptime-probe target.
- **Reproduction / verification:** code-based
- **Root cause:** not implemented
- **Recommended fix:** add `app/api/health/route.js` (`SELECT 1`) and Sentry (or a Vercel log drain) via `instrumentation.js`.
- **Validation:** a forced error appears in the tracker
- **Effort:** M   **Dependencies:** OPS-001

### OPS-005 — Migration workflow and DR
- **Category:** Database
- **Severity:** P2   **Confidence:** Medium   **Status:** Suspected
- **Affected component:** database operations
- **Evidence:** `prisma/migrations/` holds only `20260830172048_init` plus lock; `package.json:8` build does not run `migrate deploy`; `schema.prisma:20` has `url` only (no `directUrl`); no backup/restore/runbook docs
- **Impact:** if later schema changes were applied via `db push`, DB and migration history diverge; no documented recovery from a bad deploy or data loss. Provider PITR status is not verified.
- **Reproduction / verification:** code-based; DB not inspected
- **Root cause:** release process undocumented
- **Recommended fix:** make `prisma migrate deploy` an explicit release step, confirm provider backup/PITR retention, write a one-page restore runbook, add `directUrl` if a pooler is used.
- **Validation:** fresh DB `migrate deploy` reproduces the schema; a restore drill
- **Effort:** M   **Dependencies:** TST-004

### OPS-006 — In-memory login rate limit
- **Category:** Security
- **Severity:** P2   **Confidence:** Medium   **Status:** Suspected
- **Affected component:** lib/auth/loginRateLimit.js
- **Evidence:** `lib/auth/loginRateLimit.js:23` uses a module-level `Map`
- **Impact:** on Vercel serverless each instance has its own map and resets on cold start, so brute-force throttling is weak. Overlaps the auth audit; confirm there.
- **Reproduction / verification:** code-based; not executed
- **Root cause:** state kept in process memory
- **Recommended fix:** persist attempts in Postgres keyed by ip+email.
- **Validation:** attempts counted across instances
- **Effort:** M   **Dependencies:** MNT-004

### OPS-007 — No security headers
- **Category:** Security
- **Severity:** P3   **Confidence:** High   **Status:** Confirmed
- **Affected component:** next.config.mjs
- **Evidence:** `next.config.mjs:1-5` empty; grep for CSP/HSTS/X-Frame-Options in middleware/next.config/lib found none
- **Impact:** clickjacking and MIME-sniffing protections absent.
- **Reproduction / verification:** code-based (response headers not fetched)
- **Root cause:** default config
- **Recommended fix:** `headers()` in next.config.mjs with X-Frame-Options/frame-ancestors, nosniff, Referrer-Policy.
- **Validation:** `curl -I http://localhost:3000`
- **Effort:** S   **Dependencies:** none

### OPS-008 — Logs, PDFs and scratch scripts tracked
- **Category:** DevOps
- **Severity:** P3   **Confidence:** High   **Status:** Confirmed
- **Affected component:** repo hygiene
- **Evidence:** tracked: `dev.log` (505 lines; keyword scan for password/token/secret/cookie matched 0 lines), `AUDIT_REPORT.pdf`, `ISSUE_CHECKLIST.pdf`, 4 `_*.mjs` scripts
- **Impact:** repo noise and potential future leakage via logs.
- **Reproduction / verification:** `git ls-files`
- **Root cause:** no ignore rule
- **Recommended fix:** untrack `dev.log`, add `*.log` to `.gitignore` (owner decision).
- **Validation:** `git ls-files` clean
- **Effort:** S   **Dependencies:** TST-004

### OPS-009 — Mobile release assets are local-only
- **Category:** Mobile
- **Severity:** P2   **Confidence:** Medium   **Status:** Confirmed
- **Affected component:** schoolapp360 release
- **Evidence:** `eas.json`, `google-services.json`, `keystore-backup/`, a firebase service-account file present in the working dir, not tracked; real app source also untracked (MOB-002)
- **Impact:** losing the machine loses the Android signing keystore (cannot update the Play listing) and the app source; a service-account file in the project folder is an accidental-leak risk. Whether EAS holds a remote keystore copy is not verified.
- **Reproduction / verification:** `git ls-files` and `git check-ignore`
- **Root cause:** repo only has the Expo template committed
- **Recommended fix:** push source to a private remote; keep keystore in EAS credentials plus an offline copy; move the Firebase admin key out of the project directory.
- **Validation:** a fresh clone builds with `eas build`
- **Effort:** S   **Dependencies:** MOB-002

## Positive observations
- Secrets are env-based and `.env*` ignored in both repos; no `.env` tracked. Razorpay school credentials encrypted at rest. A `CRON_SECRET` check exists (flawed only when unset). Region pinned to syd1. Mobile keystore and firebase admin file are gitignored.

## Limitations / not assessed
Vercel project settings (env vars set, previews, protection), DB provider backup/PITR, domain/TLS, EAS credentials and store config were not accessible. `npm audit` not run in this pass.
