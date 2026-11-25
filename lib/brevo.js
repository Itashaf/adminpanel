// Read-only look at the Brevo account the app sends email through (SMTP, see lib/email.js): plan and
// sending limit, delivery counts, and the latest message events. Needs BREVO_API_KEY (a Brevo *API*
// key, not the SMTP key). Server only: the key never reaches the browser.
const BASE = 'https://api.brevo.com/v3';
const CACHE_MS = 60 * 1000;
const cache = globalThis.__BREVO_STATS_CACHE__ ?? (globalThis.__BREVO_STATS_CACHE__ = { at: 0, data: null });

export function isBrevoConfigured() {
  return Boolean(process.env.BREVO_API_KEY);
}

async function brevoGet(path, params = {}) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, {
    headers: { 'api-key': process.env.BREVO_API_KEY, accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Brevo answered ${res.status}`);
  }
  return res.json();
}

const ymd = (d) => d.toISOString().slice(0, 10);

function daysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

// The aggregated report's counters, reduced to the ones the page shows. Missing numbers become 0.
function pickCounts(r = {}) {
  return {
    requests: r.requests ?? 0,
    delivered: r.delivered ?? 0,
    hardBounces: r.hardBounces ?? 0,
    softBounces: r.softBounces ?? 0,
    spamReports: r.spamReports ?? 0,
    blocked: r.blocked ?? 0,
    invalid: r.invalid ?? 0,
  };
}

async function loadOverview() {
  const today = ymd(new Date());
  const [account, todayRep, week, month, events] = await Promise.allSettled([
    brevoGet('/account'),
    brevoGet('/smtp/statistics/aggregatedReport', { startDate: today, endDate: today }),
    brevoGet('/smtp/statistics/aggregatedReport', { startDate: ymd(daysAgo(6)), endDate: today }),
    brevoGet('/smtp/statistics/aggregatedReport', { startDate: ymd(daysAgo(29)), endDate: today }),
    brevoGet('/smtp/statistics/events', { limit: 50, offset: 0, sort: 'desc', startDate: ymd(daysAgo(29)), endDate: today }),
  ]);

  const errors = {};
  const pick = (label, r, fn) => {
    if (r.status === 'fulfilled') return fn(r.value);
    errors[label] = r.reason?.message || 'Failed';
    return null;
  };

  const accountInfo = pick('account', account, (a) => {
    // The sending plan is the entry whose creditsType is "sendLimit" and that is not SMS.
    const plans = Array.isArray(a.plan) ? a.plan : [];
    const mail = plans.find((p) => p.creditsType === 'sendLimit' && p.type !== 'sms') || plans[0] || null;
    return {
      company: a.companyName || a.email || '',
      planType: mail?.type || '',
      creditsRemaining: typeof mail?.credits === 'number' ? mail.credits : null,
    };
  });

  const planLimit = Number(process.env.BREVO_DAILY_LIMIT) || (accountInfo?.planType === 'free' ? 300 : null);

  return {
    configured: true,
    account: accountInfo,
    dailyLimit: planLimit,
    today: pick('today', todayRep, pickCounts),
    last7: pick('last7', week, pickCounts),
    last30: pick('last30', month, pickCounts),
    events: pick('events', events, (e) =>
      (e.events || []).map((ev) => ({
        email: ev.email || '',
        subject: ev.subject || '',
        event: ev.event || '',
        date: ev.date || '',
        reason: ev.reason || '',
      }))
    ),
    errors,
    fetchedAt: new Date().toISOString(),
  };
}

export async function getBrevoOverview({ force = false } = {}) {
  if (!isBrevoConfigured()) return { configured: false };
  if (!force && cache.data && Date.now() - cache.at < CACHE_MS) return cache.data;
  const data = await loadOverview();
  cache.data = data;
  cache.at = Date.now();
  return data;
}
