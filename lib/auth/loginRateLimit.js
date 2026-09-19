// In-memory, DB/Redis-free rate limiter for the mobile login routes
// (/api/auth/parent/login, /api/auth/teacher/login) — neither had ANY
// throttling before this, so a script could hammer credential validation
// as fast as the network allowed. Deliberately not Redis/Upstash-backed:
// this app has no such service wired up today, and adding one is a bigger
// infra decision than a login-route fix should make unilaterally. This is
// weaker on a multi-instance serverless deployment (each instance keeps its
// own counters, and a cold start resets them) than a shared store would be,
// but it still meaningfully slows a sustained attack against one warm
// instance, which is the realistic common case — not a complete defense,
// a real improvement over none.
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS_PER_ACCOUNT = 8; // this exact email, from anywhere
const MAX_ATTEMPTS_PER_IP = 20; // this IP, across any email (credential spraying)

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

// `request` is the route's own Web `Request` — `x-forwarded-for` is set by
// Vercel/most reverse proxies to the real client IP (a raw socket address
// isn't available to a Next.js Route Handler at all).
function clientIpFrom(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded ? forwarded.split(',')[0].trim() : 'unknown';
}

// Checks BOTH limits (this account, this IP) and returns the stricter
// verdict — call before running any real credential check, so a
// rate-limited request never even touches the password hash comparison.
export function checkLoginRateLimit(request, email) {
  const now = Date.now();
  cleanupStaleEntries(now);

  const ip = clientIpFrom(request);
  const accountResult = bump(`account:${email.toLowerCase()}`, MAX_ATTEMPTS_PER_ACCOUNT, now);
  const ipResult = bump(`ip:${ip}`, MAX_ATTEMPTS_PER_IP, now);

  if (!accountResult.allowed) return accountResult;
  if (!ipResult.allowed) return ipResult;
  return { allowed: true };
}
