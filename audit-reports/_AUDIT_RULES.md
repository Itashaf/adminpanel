# SchoolApp360 audit — shared brief for every auditor

This file is the single source of truth for how the audit is run. Read it fully before you start.

## Repositories in scope
- Web admin panel + API (Next.js App Router, plain JavaScript, React 19, Tailwind 4, Prisma 6 / PostgreSQL, jose JWT sessions, Razorpay, Pusher, Cloudflare R2 via AWS SDK, nodemailer, Vercel crons, region syd1):
  `C:\Users\Tashaf\Desktop\SchoolMS\adminpanel`  (call it ADMIN)
- Mobile app (Expo / React Native, Redux Toolkit, Sentry, jest present):
  `C:\Users\Tashaf\Desktop\SchoolMS\schoolapp360`  (call it MOBILE)
- Size of ADMIN: ~180 route handlers under `app/api`, ~70 pages, 74 `lib/*.js` modules, ~283 components, `prisma/schema.prisma` ~1,775 lines, `middleware.js`, `vercel.json` (2 crons), no CI workflows, no application tests.
- A PREVIOUS audit exists at `ADMIN/AUDIT_REPORT.md` (+ `.pdf`) and `ADMIN/ISSUE_CHECKLIST.md` (score 42/100, claimed ~10 unauthenticated mutating routes, a hardcoded SuperAdmin password, a `globalThis` tenant-context singleton). Treat it as a LEAD, not as truth: re-verify every claim against the CURRENT code and state whether it is still open, fixed, or not reproducible. Never copy a finding from it without re-verifying.
- The working tree has many uncommitted changes (recent work added: support-ticket system with Pusher, parent portal redesign, server-side pagination for several lists, fee-dashboard refactor, attendance trend SQL). Audit the CURRENT working tree, including those new routes and libs.
- Project instructions (`ADMIN/CLAUDE.md`, `ADMIN/AGENTS.md`): the Next.js version here has breaking changes — consult `ADMIN/node_modules/next/dist/docs/` before judging framework behaviour. Scope-discipline rule: never change application code.

## Non-negotiable rules
1. **READ-ONLY on the application.** Do not edit, create, delete or move ANY file in ADMIN or MOBILE, except files you create inside `ADMIN/audit-reports/` (reports, `_findings/`, `_progress/`). Never overwrite an existing file there that you did not create.
2. **No secrets or personal data in any output.** `ADMIN/.env`, `MOBILE/google-services.json`, `MOBILE/*firebase-adminsdk*.json`, `MOBILE/keystore-backup`, `MOBILE/eas.json`, `.env*` files contain real credentials. You MAY note their existence, location, git-tracking status (`git ls-files`, `git check-ignore`) and that they contain secret material — you must NOT print, quote, paste or hash their values, and must not echo connection strings, API keys, tokens, passwords, private keys, phone numbers or emails of real people. When citing code that contains a hardcoded secret, cite file:line and describe the type (e.g. "plaintext password literal"), never the value. Student/parent names in seed data are fine to refer to generically, not to list.
3. **No destructive or state-changing commands.** Forbidden: `npm install/update/audit fix`, `npx prisma migrate/db push/db execute/studio`, `next build` (it writes `.next` which the running dev server uses), `git commit/checkout/reset/stash/clean/push`, running ANY script in the repo root (`_reset_demo.mjs`, `_check_*.mjs`, `_simulate_*.mjs`, `prisma/seed.js`) — several mutate the database, deleting files, `curl`/HTTP to anything that is not `http://localhost:3000`, and ANY request to `/api/cron/*` (cron routes run mass jobs).
4. **Allowed commands:** file reading/grep/glob; read-only git (`git log`, `git status`, `git diff --stat`, `git ls-files`, `git check-ignore`, `git blame`); `ls`, `wc`, `find` (no -delete/-exec rm); `node -e`/scratch scripts that only READ source files; `npx eslint <paths>` (never `--fix`); `npm audit` / `npm audit --json` (read-only; if the network is blocked, record "blocked"); `npm ls`. The ONLY non-read-only-by-construction thing you may do is HTTP **GET/OPTIONS** against the already-running local dev server `http://localhost:3000` to verify authentication gates (e.g. does an `/api/...` route answer 401/403 with no cookie?) — never POST/PUT/PATCH/DELETE over HTTP (verify mutating handlers by reading code), and never GET `/api/cron/*`. No login, no real credentials.
5. **Database access:** you may run READ-ONLY SQL (`SELECT` / `EXPLAIN` without ANALYZE / `pg_catalog` / `information_schema`) through a throwaway Node script placed OUTSIDE the repo in your scratch directory, using Prisma `$queryRaw`, and ONLY after your script confirms the target host is `localhost`/`127.0.0.1` (print only host:port, never the URL; load env with `node --env-file=<ADMIN>/.env` so no value is echoed). Never touch the Sydney/Supabase/production database. Never run `EXPLAIN ANALYZE`. If unsure the host is local, do not connect.
6. **Evidence discipline.** Every finding needs file path + line numbers you actually read (re-open the file to confirm lines; do not guess). Distinguish: Confirmed defect / Confirmed vulnerability / Suspected (needs a condition verified) / Architectural improvement / Missing control / Not assessed. Do not mark something implemented because a menu item/model/component exists — trace the whole path (UI → API → lib → DB). Do not claim anything was "tested" unless you ran it; label code-reading findings as code-based. A good-practice that is merely absent is NOT automatically a finding — explain the concrete risk in this app's context.
7. **Prefer the smallest effective fix** and keep the existing stack (JavaScript, no TypeScript, no new infrastructure without measured justification). Any code in remediation examples must be JavaScript.
8. **Calibrate severity honestly** (do not inflate; do not hide a real critical issue behind a good average). P0 Critical = immediately exploitable / catastrophic tenant data leak / serious financial integrity failure. P1 High = serious security/correctness/availability/data-integrity defect to fix before production. P2 Medium. P3 Low. P4 Informational. Confidence: High (demonstrated or strong evidence) / Medium / Low. Severity ≠ confidence.
9. **Maintain a progress file** `ADMIN/audit-reports/_progress/<your-key>.md`: areas completed, pending, commands run, unresolved questions, areas needing external access. Update it as you go. If you cannot finish an area, say so explicitly in your report's "Limitations" section — never silently skip.
10. Be thorough but bounded: sample systematically across all route groups (list them first with a glob) rather than reading 180 routes superficially or 5 routes deeply. State the sampling method and the exact set of files you inspected for each claim of coverage ("N of M routes reviewed").

## Finding format (use exactly this in the Markdown reports)

```
### <ID> — <Title>
- **Category:** Security / Backend / Frontend / Database / UX / DevOps / Mobile / Other
- **Severity:** P0–P4   **Confidence:** High/Medium/Low   **Status:** Confirmed / Suspected / Not verified
- **Affected component:** module / workflow
- **Evidence:** `path/to/file.js:12-30` — what the code does (no secret values)
- **Impact:** concrete user / business / security / operational consequence
- **Reproduction / verification:** minimal safe steps (or "code-based; not executed")
- **Root cause:**
- **Recommended fix:** smallest effective change (JavaScript example only if helpful)
- **Validation:** how to confirm the fix
- **Effort:** S / M / L / XL   **Dependencies:** related IDs / migrations
```

IDs use your assigned prefixes with zero-padded numbers (e.g. `AUTH-001`). Number from 001 within each prefix. Do not reuse another auditor's prefix.

## Machine-readable output (REQUIRED)
In addition to the Markdown reports, write ONE JSON file `ADMIN/audit-reports/_findings/<your-key>.json` of this shape (valid JSON, double quotes, no comments, no trailing commas, no secret values):
```
{
  "key": "<your-key>",
  "scores": [ { "area": "<scorecard area name>", "score": 0-5 or null, "confidence": "High|Medium|Low", "evidence": "one sentence", "rationale": "1-3 sentences", "gaps": "key gaps" } ],
  "findings": [ { "id": "AUTH-001", "title": "", "category": "", "severity": "P0|P1|P2|P3|P4", "confidence": "High|Medium|Low", "status": "Confirmed|Suspected|Not verified", "component": "", "evidence": "path:lines — short", "impact": "", "recommendation": "", "effort": "S|M|L|XL", "dependencies": "", "productionBlocker": true|false } ],
  "notAssessed": [ "area — reason" ],
  "commandsRun": [ { "command": "", "result": "Passed|Failed|Blocked|Not run", "note": "" } ]
}
```
Scores are 0–5 (5 requires substantial verification; use `null` and list under notAssessed when evidence is insufficient). The scorecard areas are exactly: "Frontend engineering", "UI/UX", "Backend and APIs", "Authentication", "Authorization and tenant isolation", "Database design and integrity", "Performance", "Scalability", "Application security", "Mobile application", "Testing and QA", "DevOps and deployment", "Observability", "Privacy and operational readiness", "Maintainability". Only score the areas you own.

## Report conventions
- Each Markdown report starts with: Scope, Method (including sampling), What was verified vs only read, then Findings (format above, highest severity first), then "Positive observations" (verified good practices — short), then "Limitations / not assessed".
- Keep each report readable: a summary table of its findings at the top (ID | Sev | Conf | Title | Component), then detail.
- Do not paste large code blocks; cite file:line and describe.
- Write plain Markdown (tables, headings, lists, short fenced code). It will be converted to PDF automatically.

## When you finish
Reply with a SHORT summary (≤ 250 words): reports written (paths), finding counts by severity, your top 5 findings (ID + one line), anything you could not assess. Do not paste the reports into the reply.
