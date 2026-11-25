'use client';

import { useEffect, useState } from 'react';
import { FiMail, FiRefreshCw, FiAlertTriangle } from 'react-icons/fi';
import Button from '@/components/Button';
import FixedPaginationBar from '@/components/FixedPaginationBar';
import { getEmailStats } from '@/lib/api';

const PAGE_SIZE = 10;

// Brevo event name -> label and colour. Anything not listed shows its raw name in grey.
const EVENT_STYLES = {
  delivered: { label: 'Delivered', cls: 'bg-emerald-50 text-emerald-700' },
  requests: { label: 'Sent', cls: 'bg-gray-100 text-gray-600' },
  opened: { label: 'Opened', cls: 'bg-blue-50 text-blue-700' },
  clicks: { label: 'Clicked', cls: 'bg-blue-50 text-blue-700' },
  deferred: { label: 'Deferred', cls: 'bg-amber-50 text-amber-700' },
  softBounces: { label: 'Soft bounce', cls: 'bg-amber-50 text-amber-700' },
  hardBounces: { label: 'Hard bounce', cls: 'bg-red-50 text-red-600' },
  bounces: { label: 'Bounced', cls: 'bg-red-50 text-red-600' },
  blocked: { label: 'Blocked', cls: 'bg-red-50 text-red-600' },
  invalid: { label: 'Invalid', cls: 'bg-red-50 text-red-600' },
  spam: { label: 'Spam report', cls: 'bg-red-50 text-red-600' },
  error: { label: 'Error', cls: 'bg-red-50 text-red-600' },
};

function formatTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

function CountsCard({ title, counts, error }) {
  const rows = counts
    ? [
        ['Sent', counts.requests, ''],
        ['Delivered', counts.delivered, 'text-emerald-700'],
        ['Bounced', counts.hardBounces + counts.softBounces, counts.hardBounces + counts.softBounces > 0 ? 'text-red-600' : ''],
        ['Blocked / invalid', counts.blocked + counts.invalid, counts.blocked + counts.invalid > 0 ? 'text-red-600' : ''],
        ['Spam reports', counts.spamReports, counts.spamReports > 0 ? 'text-red-600' : ''],
      ]
    : [];
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-sm font-semibold text-gray-900 mb-3">{title}</p>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <dl className="space-y-2">
        {rows.map(([label, value, cls]) => (
          <div key={label} className="flex items-center justify-between text-sm">
            <dt className="text-gray-500">{label}</dt>
            <dd className={`font-semibold tabular-nums ${cls || 'text-gray-900'}`}>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function EmailStatsExplorer() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);

  const load = async (refresh = false) => {
    setIsRefreshing(true);
    setError('');
    try {
      setData(await getEmailStats({ refresh }));
    } catch (err) {
      setError(err.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  // First load. The Refresh button uses load() above (it also shows the refreshing state).
  useEffect(() => {
    let cancelled = false;
    getEmailStats()
      .then((result) => !cancelled && setData(result))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, []);

  const events = data?.events || [];
  const totalPages = Math.max(1, Math.ceil(events.length / PAGE_SIZE));
  const pagedEvents = events.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const sentToday = data?.today?.requests ?? 0;
  const limit = data?.dailyLimit || null;
  const usedPercent = limit ? Math.min(100, Math.round((sentToday / limit) * 100)) : 0;
  const barColor = usedPercent >= 100 ? 'bg-red-500' : usedPercent >= 80 ? 'bg-amber-500' : 'bg-indigo-600';

  return (
    <div className="space-y-5 pb-12">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-indigo-100 text-indigo-700 shrink-0">
            <FiMail className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">Email</h1>
            <p className="text-sm text-gray-500">Sending limit and delivery for the mail the app sends through Brevo.</p>
          </div>
        </div>
        <Button
          label={isRefreshing ? 'Refreshing...' : 'Refresh'}
          variant="secondary"
          icon={<FiRefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-pulse' : ''}`} />}
          onClick={() => load(true)}
          disabled={isRefreshing}
        />
      </div>

      {error && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{error}</p>}

      {!data && !error && (
        <div className="space-y-4 animate-pulse">
          <div className="h-28 bg-gray-100 rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 bg-gray-100 rounded-2xl" />
            ))}
          </div>
        </div>
      )}

      {data && data.configured === false && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-sm font-semibold text-gray-900 mb-1">Brevo is not connected yet</p>
          <p className="text-sm text-gray-500">
            Create an API key in Brevo (SMTP &amp; API, API Keys) and set it as <span className="font-mono">BREVO_API_KEY</span> in the
            server environment (local <span className="font-mono">.env</span> and Vercel), then restart. It is a different key from the SMTP key.
          </p>
        </div>
      )}

      {data && data.configured && (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm text-gray-500">Sent today</p>
                <p className="text-3xl font-bold text-gray-900 tabular-nums">
                  {sentToday}
                  {limit ? <span className="text-lg font-semibold text-gray-400"> / {limit}</span> : null}
                </p>
              </div>
              <div className="text-sm text-gray-500 sm:text-right">
                {data.errors?.account ? (
                  <p className="text-red-500">{data.errors.account}</p>
                ) : (
                  <>
                    <p>
                      Plan: <span className="font-semibold text-gray-900 capitalize">{data.account?.planType || '—'}</span>
                    </p>
                    {data.account?.creditsRemaining !== null && data.account?.creditsRemaining !== undefined && (
                      <p>
                        Left to send: <span className="font-semibold text-gray-900 tabular-nums">{data.account.creditsRemaining}</span>
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
            {limit && (
              <div className="mt-4">
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className={`h-full rounded-full ${barColor}`} style={{ width: `${usedPercent}%` }} />
                </div>
                {usedPercent >= 80 && (
                  <p className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${usedPercent >= 100 ? 'text-red-600' : 'text-amber-600'}`}>
                    <FiAlertTriangle className="w-3.5 h-3.5" />
                    {usedPercent >= 100 ? 'Daily limit reached: new emails will not be sent until it resets.' : `${usedPercent}% of today's limit used.`}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CountsCard title="Today" counts={data.today} error={data.errors?.today} />
            <CountsCard title="Last 7 days" counts={data.last7} error={data.errors?.last7} />
            <CountsCard title="Last 30 days" counts={data.last30} error={data.errors?.last30} />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">Recent messages</p>
              <p className="text-xs text-gray-400">Latest events, newest first. Brevo may take a few minutes to show a new one.</p>
            </div>
            {data.errors?.events ? (
              <p className="text-sm text-red-500 px-5 py-6">{data.errors.events}</p>
            ) : events.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-12">No messages in the last 30 days.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] table-fixed text-sm">
                  <colgroup>
                    <col className="w-[18%]" />
                    <col className="w-[27%]" />
                    <col className="w-[33%]" />
                    <col className="w-[22%]" />
                  </colgroup>
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      <th className="py-3 pl-5 pr-4">Time</th>
                      <th className="py-3 px-4">To</th>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 pl-4 pr-5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {pagedEvents.map((ev, i) => {
                      const style = EVENT_STYLES[ev.event] || { label: ev.event || '—', cls: 'bg-gray-100 text-gray-600' };
                      return (
                        <tr key={`${ev.date}-${ev.email}-${ev.event}-${i}`} className="hover:bg-gray-50/60 transition">
                          <td className="py-3 pl-5 pr-4 align-middle text-gray-500 whitespace-nowrap">{formatTime(ev.date)}</td>
                          <td className="py-3 px-4 align-middle text-gray-900">
                            <span className="block truncate" title={ev.email}>{ev.email}</span>
                          </td>
                          <td className="py-3 px-4 align-middle text-gray-600">
                            <span className="block truncate" title={ev.subject}>{ev.subject || '—'}</span>
                          </td>
                          <td className="py-3 pl-4 pr-5 align-middle">
                            <span
                              className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${style.cls}`}
                              title={ev.reason || ''}
                            >
                              {style.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <FixedPaginationBar
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalCount={events.length}
            pageSize={PAGE_SIZE}
            itemLabel="events"
          />
        </>
      )}
    </div>
  );
}
