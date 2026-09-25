// In-memory, DB/Redis-free rate limiter for every login/password-reset entry
// point — web (Server Actions in app/actions/auth.js) and mobile
// (/api/auth/parent/login, /api/auth/teacher/login) alike. None had ANY
// throttling before this, so a script could hammer credential validation or
// spam password-reset emails as fast as the network allowed. Deliberately
// not Redis/Upstash-backed: this app has no such service wired up today, and
// adding one is a bigger infra decision than a login-route fix should make
// unilaterally. This is weaker on a multi-instance serverless deployment
// (each instance keeps its own counters, and a cold start resets them) than
// a shared store would be, but it still meaningfully slows a sustained
// attack against one warm instance, which is the realistic common case —
// not a complete defense, a real improvement over none.
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOGIN_MAX_PER_ACCOUNT = 8; // this exact email, from anywhere
const LOGIN_MAX_PER_IP = 20; // this IP, across any email (credential spraying)

// Stricter than login — a reset request sends a real email, so this also
// guards against mail-bombing one inbox and against burning through
// whatever email-sending quota/reputation this app has.
const RESET_MAX_PER_ACCOUNT = 3;
const RESET_MAX_PER_IP = 10;

const attemptsByKey = new Map(); // key -> { count, windowStart }
let lastCleanup = Date.now();

function cleanupStaleEntries(now) {
  if (now - lastCleanup < WINDOW_MS) return;
  for (const [key, entry] of attemptsByKey) {
    if (now - entry.windowStart > WINDOW_MS) attemptsByKey.delete(key);
  }
  lastCleanup = now;
}

function bump(key, max, now) {
  const entry = attemptsByKey.get(key);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    attemptsByKey.set(key, { count: 1, windowStart: now });
    return { allowed: true };
  }
  entry.count += 1;
  if (entry.count > max) {
    return { allowed: false, retryAfterSeconds: Math.ceil((WINDOW_MS - (now - entry.windowStart)) / 1000) };
  }
  return { allowed: true };
}

// `headersLike` is anything with a `.get(name)` method — a Route Handler's
// `request.headers`, or a Server Action's `await headers()` from
// `next/headers`. `x-forwarded-for` is set by Vercel/most reverse proxies to
// the real client IP (a raw socket address isn't available to either call
// shape at all).
function clientIpFrom(headersLike) {
  const forwarded = headersLike.get('x-forwarded-for');
  return forwarded ? forwarded.split(',')[0].trim() : 'unknown';
}

// Shared by checkLoginRateLimit/checkPasswordResetRateLimit — checks BOTH
// limits (this account, this IP) under their own key prefix (so a login
// attempt and a reset attempt for the same email never share one counter)
// and returns the stricter verdict.
function checkBoth(headersLike, email, prefix, maxPerAccount, maxPerIp) {
  const now = Date.now();
  cleanupStaleEntries(now);

  const ip = clientIpFrom(headersLike);
  const accountResult = bump(`${prefix}account:${email.toLowerCase()}`, maxPerAccount, now);
  const ipResult = bump(`${prefix}ip:${ip}`, maxPerIp, now);

  if (!accountResult.allowed) return accountResult;
  if (!ipResult.allowed) return ipResult;
  return { allowed: true };
}

// Call before running any real credential check, so a rate-limited request
// never even touches the password hash comparison.
export function checkLoginRateLimit(headersLike, email) {
  return checkBoth(headersLike, email, 'login-', LOGIN_MAX_PER_ACCOUNT, LOGIN_MAX_PER_IP);
}

// Call before sending a password-reset email.
export function checkPasswordResetRateLimit(headersLike, email) {
  return checkBoth(headersLike, email, 'reset-', RESET_MAX_PER_ACCOUNT, RESET_MAX_PER_IP);
}

// Turns a `retryAfterSeconds` into what a Server Action's `{ error }` string
// says (no HTTP status/Retry-After header reaches the client that way) —
// shared so every caller's wording matches.
export function rateLimitMessage(retryAfterSeconds) {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Too many attempts. Please try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
}
