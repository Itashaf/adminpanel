import Link from 'next/link';
import { FiAlertTriangle, FiChevronRight, FiCheckCircle } from 'react-icons/fi';

const SEVERITY = {
  red: {
    dot: 'bg-red-500',
    icon: 'text-red-600 bg-red-50',
    badge: 'text-red-700 bg-red-50 border-red-100',
    label: 'Critical',
  },
  amber: {
    dot: 'bg-amber-500',
    icon: 'text-amber-600 bg-amber-50',
    badge: 'text-amber-700 bg-amber-50 border-amber-100',
    label: 'Needs review',
  },
};

// Every alert here comes from a real query (see lib/dashboard.js's
// smartAlerts — overdue fee headcount, pending exam-marks-by-class); there
// is no placeholder/demo alert baked into this component, so an empty
// `alerts` array renders the "all clear" state rather than fabricated rows.
export default function SmartAlertsCard({ alerts = [] }) {
  const sorted = [...alerts].sort((a, b) => (a.severity === 'red' ? -1 : 1) - (b.severity === 'red' ? -1 : 1));

  return (
    <div className="relative overflow-hidden bg-white/70 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm p-5">
      <div className="pointer-events-none absolute -bottom-16 -right-10 w-52 h-52 rounded-full bg-gradient-to-br from-violet-200/40 to-blue-200/40 blur-3xl" />

      <div className="relative flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-9 h-9 rounded-xl text-white shadow-sm shadow-indigo-900/10 bg-gradient-to-br from-violet-500 to-blue-600">
            <FiAlertTriangle className="w-4 h-4" />
          </span>
          <h3 className="text-base font-semibold text-gray-900">Smart Alerts</h3>
        </div>
        {sorted.length > 0 && (
          <span className="text-xs font-bold text-gray-500 bg-gray-50 rounded-full px-2.5 py-1">{sorted.length}</span>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="relative flex items-center gap-3 rounded-xl bg-green-50/70 border border-green-100 px-4 py-4">
          <FiCheckCircle className="w-5 h-5 text-green-600 shrink-0" />
          <p className="text-sm text-green-800 font-medium">All clear — nothing needs your attention right now.</p>
        </div>
      ) : (
        <div className="relative flex flex-col gap-2.5">
          {sorted.map((alert) => {
            const tone = SEVERITY[alert.severity] || SEVERITY.amber;
            const Wrapper = alert.href ? Link : 'div';
            return (
              <Wrapper
                key={alert.id}
                href={alert.href}
                className={`group flex items-center gap-3 rounded-xl bg-white/60 backdrop-blur-md border border-white/60 px-4 py-3 transition duration-200 ${
                  alert.href ? 'hover:shadow-md hover:-translate-y-0.5 hover:border-violet-200/70 cursor-pointer' : ''
                }`}
              >
                <span className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${tone.icon}`}>
                  <FiAlertTriangle className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">{alert.message}</p>
                </div>
                <span className={`hidden sm:inline-flex text-[10px] font-bold uppercase tracking-wide border rounded-full px-2 py-0.5 shrink-0 ${tone.badge}`}>
                  {tone.label}
                </span>
                {alert.href && (
                  <FiChevronRight className="w-4 h-4 text-gray-300 group-hover:text-violet-500 transition shrink-0" />
                )}
              </Wrapper>
            );
          })}
        </div>
      )}
    </div>
  );
}
