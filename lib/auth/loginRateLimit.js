import prisma from '../db';

// Rate limiter for every login / password-reset entry point — web (Server Actions
// in app/actions/auth.js) and mobile (/api/auth/*/login). Counters live in the
// database (table RateLimitCounter) so the limit holds across serverless
// instances and restarts; the first version kept them in process memory, where
// every cold start or extra instance gave an attacker a fresh allowance.
// If the database cannot be reached it falls back to counting in memory, so a
// database hiccup never locks everybody out.
const WINDOW_SECONDS = 15 * 60;
const LOGIN_MAX_PER_ACCOUNT = 8; // this exact email, from anywhere
const LOGIN_MAX_PER_IP = 20; // this IP, across any email (credential spraying)

// Stricter than login — a reset request sends a real email, so this also guards
// against mail-bombing one inbox and against burning through the email quota.
const RESET_MAX_PER_ACCOUNT = 3;
const RESET_MAX_PER_IP = 10;

const memory = globalThis.__RATE_LIMIT_MEMORY__ ?? (globalThis.__RATE_LIMIT_MEMORY__ = new Map());

function bumpInMemory(key, max) {
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || now - entry.windowStart > WINDOW_SECONDS * 1000) {
    memory.set(key, { count: 1, windowStart: now });
    return { allowed: true };
  }
  entry.count += 1;
  if (entry.count > max) return { allowed: false, retryAfterSeconds: Math.ceil((WINDOW_SECONDS * 1000 - (now - entry.windowStart)) / 1000) };
  return { allowed: true };
}

// One atomic statement: start a new window if the old one ended, otherwise add 1.
async function bump(key, max) {
  try {
    const rows = await prisma.$queryRaw`
      INSERT INTO "RateLimitCounter" ("key", "count", "windowStart")
      VALUES (${key}, 1, NOW())
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimitCounter"."windowStart" < NOW() - make_interval(secs => ${WINDOW_SECONDS}) THEN 1 ELSE "RateLimitCounter"."count" + 1 END,
        "windowStart" = CASE WHEN "RateLimitCounter"."windowStart" < NOW() - make_interval(secs => ${WINDOW_SECONDS}) THEN NOW() ELSE "RateLimitCounter"."windowStart" END
      RETURNING "count", EXTRACT(EPOCH FROM ("windowStart" + make_interval(secs => ${WINDOW_SECONDS}) - NOW())) AS "retry"
    `;
    const { count, retry } = rows[0];
    if (Number(count) > max) return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(Number(retry))) };
    return { allowed: true };
  } catch (err) {
    console.error('rate limit store unavailable, using memory', err?.message || err);
    return bumpInMemory(key, max);
  }
}

// Old counters are only ever a few rows; clear them out now and then.
async function cleanupSometimes() {
  if (Math.random() > 0.02) return;
  try {
    await prisma.$executeRaw`DELETE FROM "RateLimitCounter" WHERE "windowStart" < NOW() - interval '1 hour'`;
  } catch {
    // best effort
  }
}

// `headersLike` is anything with a `.get(name)` method — a Route Handler's
// `request.headers`, or a Server Action's `await headers()`. Prefer the headers the
// hosting platform sets itself over the client-supplied start of x-forwarded-for.
function clientIpFrom(headersLike) {
  const direct = headersLike.get('x-vercel-forwarded-for') || headersLike.get('x-real-ip');
  if (direct) return direct.split(',')[0].trim();
  const forwarded = headersLike.get('x-forwarded-for');
  return forwarded ? forwarded.split(',')[0].trim() : 'unknown';
}

// Checks BOTH limits (this account, this IP) under their own key prefix (a login
// attempt and a reset attempt for the same email never share one counter) and
// returns the stricter verdict.
async function checkBoth(headersLike, email, prefix, maxPerAccount, maxPerIp) {
  const ip = clientIpFrom(headersLike);
  const [accountResult, ipResult] = await Promise.all([
    bump(`${prefix}account:${String(email).toLowerCase()}`, maxPerAccount),
    bump(`${prefix}ip:${ip}`, maxPerIp),
  ]);
  cleanupSometimes();
  if (!accountResult.allowed) return accountResult;
  if (!ipResult.allowed) return ipResult;
  return { allowed: true };
}

// Call (and await) before running any real credential check, so a rate-limited
// request never even touches the password hash comparison.
export function checkLoginRateLimit(headersLike, email) {
  return checkBoth(headersLike, email, 'login-', LOGIN_MAX_PER_ACCOUNT, LOGIN_MAX_PER_IP);
}

// Call (and await) before sending a password-reset email.
export function checkPasswordResetRateLimit(headersLike, email) {
  return checkBoth(headersLike, email, 'reset-', RESET_MAX_PER_ACCOUNT, RESET_MAX_PER_IP);
}

// Turns a `retryAfterSeconds` into what a Server Action's `{ error }` string says
// (no HTTP status/Retry-After header reaches the client that way) — shared so
// every caller's wording matches.
export function rateLimitMessage(retryAfterSeconds) {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Too many attempts. Please try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
}
