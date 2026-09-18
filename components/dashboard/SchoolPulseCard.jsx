import { FiUsers, FiBookOpen, FiCheckSquare, FiHeart } from 'react-icons/fi';
import { HiOutlineAcademicCap } from 'react-icons/hi2';

function formatCurrency(amount) {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

const STATUS_COLOR = {
  Excellent: 'text-emerald-200',
  Good: 'text-emerald-200',
  Fair: 'text-amber-200',
  'Needs Attention': 'text-red-200',
};

const METRIC_STYLE = {
  attendance: { icon: FiUsers, iconBg: 'bg-emerald-400/90' },
  fees: { icon: FiBookOpen, iconBg: 'bg-violet-400/90' },
  admissions: { icon: HiOutlineAcademicCap, iconBg: 'bg-blue-400/90' },
  tasks: { icon: FiCheckSquare, iconBg: 'bg-purple-400/90' },
};

// Executive-summary strip at the top of the dashboard — replaces the large
// greeting banner. Every figure is real (see lib/dashboard.js's
// getDashboardOverview → schoolPulse): today's attendance, today's actual
// pending-fee total, real admissions this month, and the same pending-task
// count Smart Alerts uses. healthScore is a transparent weighted blend of
// those signals, not an invented number — see the comment next to where
// it's computed. This is the one card that carries the brand gradient (see
// the design system's "gradient only for the hero card" rule) — every
// other dashboard card stays plain white.
export default function SchoolPulseCard({ name, pulse }) {
  const statusColor = STATUS_COLOR[pulse.healthStatus] || 'text-white/80';

  const metrics = [
    { key: 'attendance', label: 'Attendance Today', value: pulse.attendanceToday != null ? `${pulse.attendanceToday}%` : '—', trend: 'up' },
    { key: 'fees', label: 'Pending Fees', value: formatCurrency(pulse.pendingFees), trend: 'down' },
    { key: 'admissions', label: 'New Admissions', value: pulse.newAdmissionsThisMonth, trend: pulse.newAdmissionsThisMonth > 0 ? 'up' : 'flat' },
    { key: 'tasks', label: 'Pending Tasks', value: pulse.pendingTasks, trend: pulse.pendingTasks > 0 ? 'up' : 'flat' },
  ];

  return (
    <div className="relative overflow-hidden rounded-[24px] p-6 shadow-lg shadow-indigo-950/10 bg-gradient-to-br from-[#2563EB] to-[#7C3AED]">
      <div className="pointer-events-none absolute -top-20 -right-14 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 w-56 h-56 rounded-full bg-[#8B5CF6]/30 blur-3xl" />

      <div className="relative flex flex-col lg:flex-row lg:items-stretch lg:justify-between gap-6">
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold text-white leading-tight">
            Good Afternoon,
            <br />
            {name} 👋
          </p>
          <p className="text-sm text-white/70 mt-2">Here&apos;s what&apos;s happening at your school today.</p>

          <div className="flex flex-wrap gap-3 mt-5">
            {metrics.map((m) => {
              const style = METRIC_STYLE[m.key];
              const Icon = style.icon;
              return (
                <div key={m.key} className="flex-1 min-w-[150px] bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`flex items-center justify-center w-9 h-9 rounded-xl text-white shrink-0 ${style.iconBg}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    {m.trend !== 'flat' && (
                      <span className={`text-xs ${m.trend === 'up' ? 'text-emerald-300' : 'text-red-300'}`}>
                        {m.trend === 'up' ? '↗' : '↘'}
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-white tabular-nums tracking-tight leading-tight mt-2">{m.value}</p>
                  <p className="text-xs text-white/70 mt-0.5">{m.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-5 py-4 lg:w-52 shrink-0 flex flex-col justify-between">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/20 text-white shrink-0">
              <FiHeart className="w-4 h-4" />
            </span>
            <p className="text-xs font-medium text-white/70 uppercase tracking-wide">School Health Score</p>
          </div>
          <p className="text-4xl font-bold text-white mt-3 tabular-nums leading-tight">
            {pulse.healthScore}
            <span className="text-base font-medium text-white/60"> / 100</span>
          </p>
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden mt-3">
            <div className="h-full bg-white rounded-full transition-all" style={{ width: `${pulse.healthScore}%` }} />
          </div>
          <p className={`text-sm font-semibold mt-2 ${statusColor}`}>{pulse.healthStatus}</p>
        </div>
      </div>
    </div>
  );
}
