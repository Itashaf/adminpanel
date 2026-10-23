# 07 - Security risk register (auditor A4)

## Scope
Cross-cutting security risks beyond tenant/RBAC (see 04-security-and-tenant-isolation.md): OWASP mapping, uploads, payments/webhooks, notification abuse, rate limiting, CORS/CSRF/headers, XSS, SSRF, path traversal, secrets, error leakage and dependency audit.

## Method
Read next.config.mjs, middleware.js, lib/storage.js, all *upload-url routes (sampled 4 in full), lib/razorpay.js, payments routes, cron routes, lib/email.js, lib/pushTokens.js, print window templates; grep sweeps for dangerouslySetInnerHTML/innerHTML/document.write/eval, raw SQL, server-side fetch, secret-shaped literals (location only); `npm audit --json` (read-only). Code-based; no dynamic testing.

## OWASP Top 10 mapping
| OWASP 2021 | Status in this codebase | Findings |
|---|---|---|
| A01 Broken access control | Weak: session-less fallback actor, role-shortcut libs, unguarded SSR pages, global roles, Parent over-permission | API-001..004, SEC-001, 002, 004, 005, 006, 017, PRV-001 |
| A02 Cryptographic failures | Mixed: bcrypt and AES-GCM good; Aadhaar/PAN plaintext, unhashed reset tokens, Math.random temp passwords | PRV-003, SEC-010, API-010 |
| A03 Injection | Good: Prisma parameterised, escaped print HTML, no eval/innerHTML; one literal-column raw SQL | none |
| A04 Insecure design | Global tenant singleton and demo role toggle in production identity path | SEC-004, API-001 |
| A05 Security misconfiguration | No headers/CSP, CORS *, deprecated middleware, dev.log tracked, error messages leaked | SEC-007, SEC-019, OBS-012, API-009 |
| A06 Vulnerable components | next critical advisories, nodemailer, sharp, dev-chain highs | SEC-008, SEC-009, SEC-015 |
| A07 Identification and authentication failures | No revocation, in-memory rate limit, weak reset flow, email collisions | SEC-003, 010, 011, 013, 018, API-008 |
| A08 Software and data integrity failures | No webhook; client-callback payment finalisation; no CI | BIZ-002, FE-001 |
| A09 Logging and monitoring failures | No audit trail on sensitive actions, console-only errors | OBS-001, OBS-008 |
| A10 SSRF | No server-side fetch of user-supplied URLs found (grep); Next image-optimiser SSRF advisory applies to framework | SEC-008 |

## Summary table (findings owned by this report)
| ID | Sev | Conf | Title | Component |
|---|---|---|---|---|
| SEC-008 | P1 | Medium | next 16.3.2 is in the affected range of critical and high advisories (image optimisation RCE/SSRF, next/og RCE, cache poisoning) | package.json:24 |
| SEC-007 | P2 | High | No security headers (CSP, frame-ancestors, HSTS, nosniff) and CORS * on every /api route | next.config.mjs, middleware.js |
| SEC-014 | P2 | Medium | Plaintext demo credentials remain in source: comment in lib/auth.js and seed admin password literals; prior commit history held the SuperAdmin credential | lib/auth.js, prisma/seed.js |
| SEC-009 | P3 | High | nodemailer 10.0.1 has multiple advisories (DoS, cross-transport TLS servername reuse); sharp has libheif/librsvg advisories | package.json:25; lib/email.js |
| SEC-015 | P4 | High | Thirteen high-severity transitive advisories in dev tooling (eslint-config-next chain, prisma CLI chain, brace-expansion, js-yaml, source-map-js) | package-lock |
| SEC-019 | P4 | Medium | Hardening gaps: no CSRF token (relies on SameSite=Lax, request.json ignores content type), deprecated middleware filename, JWT without iss/aud and shared by web and mobile | session/middleware |

## Risk register by topic
| Topic | Observation | Risk | Ref |
|---|---|---|---|
| File uploads | Presigned PUT to a public R2 bucket; type allow-list (png/jpeg/webp/pdf, no SVG/HTML) and client-stated size cap; ContentLength not signed; key = prefix/schoolId/timestamp-sanitised-name; free-form attachmentUrl/photoUrl stored | Medium: storage abuse, guessable public URLs for Aadhaar documents, no content sniffing | API-007, PRV-002 |
| Razorpay | Order amount from DB; HMAC verified with timingSafeEqual; order-to-fee binding checked; per-school secrets AES-256-GCM (single ENCRYPTION_KEY, no rotation). No webhook, no idempotency key, create-order and verify unauthenticated | High (availability and abuse), signature logic sound | API-003, BIZ-002, BIZ-003 |
| Webhooks | None exist, so no signature or replay surface; also no server-to-server confirmation | See BIZ-002 | BIZ-002 |
| Push / email / SMS abuse | Fan-out (notices, fee reminders) gated by notices.create; no per-user send caps; reminders accept unbounded studentIds; no SMS integration found; email only teacher invite/reset | Medium | API-006, SEC-016 |
| Rate limiting / brute force | Logins and reset only, in-memory, XFF-spoofable; nothing on create-order, upload-url, tickets, bulk | Medium | API-008, SEC-011 |
| Account enumeration | Login generic; forgot-password generic but timing differs | Low | SEC-018 |
| CORS / CSRF | CORS * for all /api (no credentials flag, so cookies not sent cross-origin); CSRF relies on SameSite=Lax; server actions use Next origin check | Medium with API-001 | SEC-007, SEC-019 |
| Security headers | None configured | Medium | SEC-007 |
| XSS | No dangerouslySetInnerHTML/innerHTML/eval; five print windows use document.write with escapeHtml on all user strings (verified for report card and fee receipt; monthly/yearly spot-checked); React 19 blocks javascript: hrefs for attachment links | Low | positive |
| SSRF | No server-side fetch of user-supplied URLs; Expo push and Razorpay fixed hosts | Low (framework advisory in SEC-008) | SEC-008 |
| Path traversal | R2 keys are object keys not file paths, filenames sanitised to [a-zA-Z0-9._-]; no filesystem reads of user input found | Low | positive |
| Secrets | .env and .env.local are git-ignored and untracked; no live-key-shaped literals in app source (only a placeholder in a form); password literal in lib/auth.js comment and prisma/seed.js; dev.log tracked (no emails or secret keywords found by count) | Medium (suspected) | SEC-014, OBS-012 |
| Client bundle | Only NEXT_PUBLIC_APP_URL referenced; Razorpay key id (public by design) sent to client; key secret never leaves lib/razorpay.js | Low | positive |
| Error leakage | err.message returned in about 97 places | Low | API-009 |
| Cron | CRON_SECRET bearer, fails open when env unset | Medium | BIZ-001, OBS-004 |

## npm audit (read-only, npm audit --json)
Total 14: 1 critical, 13 high, 0 moderate/low at top level. Critical: next 16.0.0-16.3.7 (installed 16.3.2; fix 16.4.1 non-major) covering image-optimisation RCE and SSRF, next/og RCE, ISR/SSG cache poisoning, metadata image route disclosure. High direct: nodemailer <=10.0.8 (fix available), prisma and eslint-config-next (CLI/dev chains). Transitive high: sharp, brace-expansion, js-yaml, source-map-js, braces, micromatch, fast-glob, deepmerge-ts, @prisma/config.

## Findings
### SEC-008 - next 16.3.2 is in the affected range of critical and high advisories (image optimisation RCE/SSRF, next/og RCE, cache poisoning)
- **Severity:** P1   **Confidence:** Medium   **Status:** Confirmed   **Production blocker:** yes
- **Evidence:** package.json:24 (next 16.3.2 pinned); npm audit --json: next critical, fix 16.4.1 (non-major). App imports next/image in components/LoginForm.jsx and uses no next/og; exploitability depends on image config and hosting (not verified).
- **Impact:** Known unauthenticated RCE/SSRF classes in the framework; presence confirmed, exploitability not verified.
- **Recommendation:** Upgrade next to the patched release (16.4.1 or later), re-run npm audit, and review images config.   (effort S)

### SEC-007 - No security headers (CSP, frame-ancestors, HSTS, nosniff) and CORS * on every /api route
- **Severity:** P2   **Confidence:** High   **Status:** Confirmed   **Production blocker:** no
- **Evidence:** next.config.mjs:1-4 (empty config); middleware.js:62-66 (Access-Control-Allow-Origin: *)
- **Impact:** Clickjacking of the admin UI; no CSP defence in depth; with API-001 any website can read session-less API responses cross-origin from a victim browser.
- **Recommendation:** Add headers() in next.config (CSP, X-Frame-Options/frame-ancestors, nosniff, Referrer-Policy, HSTS); restrict CORS to known origins, since only the native app needs Bearer access.   (effort S; depends on API-001)

### SEC-014 - Plaintext demo credentials remain in source: comment in lib/auth.js and seed admin password literals; prior commit history held the SuperAdmin credential
- **Severity:** P2   **Confidence:** Medium   **Status:** Suspected   **Production blocker:** no
- **Evidence:** lib/auth.js:6 (password literal in comment); prisma/seed.js:112-117 (two school-admin password literals); git history commit e3ae319 removed the earlier hardcoded SuperAdmin credential. See 14-prior-audit-reconciliation.md. Values not reproduced.
- **Impact:** If any deployed database was seeded with these accounts the credentials are public to repo readers.
- **Recommendation:** Delete the comment; verify and rotate any seeded account in production; make the seed generate random passwords.   (effort S)

### SEC-009 - nodemailer 10.0.1 has multiple advisories (DoS, cross-transport TLS servername reuse); sharp has libheif/librsvg advisories
- **Severity:** P3   **Confidence:** High   **Status:** Confirmed   **Production blocker:** no
- **Evidence:** npm audit --json: nodemailer <=10.0.8, sharp <=0.35.5-rc.1; lib/email.js:11-26 builds one transport from env
- **Impact:** Recipient parsing DoS reachable via user-supplied emails; the cross-tenant SMTP issue does not apply while a single env-configured transport is used.
- **Recommendation:** Upgrade nodemailer and sharp to fixed versions.   (effort S)

### SEC-015 - Thirteen high-severity transitive advisories in dev tooling (eslint-config-next chain, prisma CLI chain, brace-expansion, js-yaml, source-map-js)
- **Severity:** P4   **Confidence:** High   **Status:** Confirmed   **Production blocker:** no
- **Evidence:** npm audit --json (14 total: 1 critical, 13 high; critical is SEC-008)
- **Impact:** Build-time DoS classes only; not in the runtime request path.
- **Recommendation:** Update with npm audit fix in a branch when convenient.   (effort S)

### SEC-019 - Hardening gaps: no CSRF token (relies on SameSite=Lax, request.json ignores content type), deprecated middleware filename, JWT without iss/aud and shared by web and mobile
- **Severity:** P4   **Confidence:** Medium   **Status:** Confirmed   **Production blocker:** no
- **Evidence:** lib/auth/session.js:15-21; lib/auth/jwt.js:12-19; middleware.js (Next 16 renamed middleware to proxy, docs version-16.md)
- **Impact:** Defence in depth only; cookie is httpOnly, Secure in production, SameSite=Lax.
- **Recommendation:** Rename to proxy.js, add iss/aud and separate secrets for cookie and bearer tokens, enforce JSON content type.   (effort S)


## Positive observations
- No HTML sinks; escaped print templates; parameterised SQL.
- Razorpay secrets encrypted per school; constant-time signature compare.
- Upload allow-list excludes SVG/HTML; filenames sanitised; keys namespaced by school.
- Cookie flags correct; reset link not derived from request Host.

## Limitations / not assessed
- Live endpoint verification - the local dev server was not running (curl returned no response); all auth results are code-based
- Production hosting configuration (Vercel headers, env values, CRON_SECRET presence, bucket public/ACL settings) - not accessible
- Mobile client security (schoolapp360) - covered by 08-mobile-application-audit.md
- Every lib function and every one of 283 components - sampled; tenant filters verified by grep on update/delete/findUnique-by-id patterns plus targeted reads
- JWT_SECRET / ENCRYPTION_KEY entropy and rotation - env values must not be read
- R2 bucket policy and CORS, Pusher channel auth, Expo push abuse limits - external configuration
