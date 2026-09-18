// Decorative-only sparkline (no historical series exists to chart
// honestly) — a fixed ascending bar shape purely to match the reference
// design's visual rhythm, never labeled with a value.
function Sparkline({ colorClass }) {
  const heights = [30, 45, 35, 55, 40, 65, 50, 75, 60, 85];
  return (
    <div className="hidden sm:flex items-end gap-1 h-10 shrink-0">
      {heights.map((h, i) => (
        <span key={i} className={`w-1.5 rounded-full ${colorClass}`} style={{ height: `${h}%`, opacity: 0.25 + (i / heights.length) * 0.55 }} />
      ))}
    </div>
  );
}

const ACCENTS = {
  blue: { iconBg: 'bg-blue-100 text-blue-600', bar: 'bg-blue-400' },
  violet: { iconBg: 'bg-violet-100 text-violet-600', bar: 'bg-violet-400' },
};

// `variant="minimal"` is the KPI row's own look — a colored icon tile, a
// decorative sparkline, one big number, one line of real context. Every
// other prop below is the original card, kept exactly as-is because the
// Teacher dashboard's stat row still renders through it.
export default function StatCard({
  label,
  value,
  icon,
  iconBgClassName,
  trend,
  trendLabel,
  variant,
  accent = 'blue',
  // A short real line under the number — e.g. "+12 this month" or "+3% vs
  // last week" — never a fabricated one; the caller only passes this when
  // it has an actual figure to show.
  context,
  contextTone, // 'up' | 'down' | undefined
}) {
  if (variant === 'minimal') {
    const palette = ACCENTS[accent] || ACCENTS.blue;
    return (
      <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-6 transition-all duration-200 hover:shadow-md">
        <div className="flex items-center justify-between gap-3">
          {icon && (
            <span className={`flex items-center justify-center w-11 h-11 rounded-xl shrink-0 ${palette.iconBg}`}>{icon}</span>
          )}
          <Sparkline colorClass={palette.bar} />
        </div>
        <p className="text-sm font-medium text-gray-500 mt-4">{label}</p>
        <p className="text-4xl font-bold text-gray-900 tabular-nums tracking-tight leading-tight mt-1">{value}</p>
        {context && (
          <p className="flex items-center gap-1.5 text-sm text-gray-400 mt-2">
            <span
              className={`flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold shrink-0 ${
                contextTone === 'up' ? 'bg-green-100 text-green-600' : contextTone === 'down' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'
              }`}
            >
              {contextTone === 'up' ? '▲' : contextTone === 'down' ? '▼' : '−'}
            </span>
            {context}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
        <span className={`flex items-center justify-center w-9 h-9 rounded-lg ${iconBgClassName}`}>{icon}</span>
      </div>

      <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>

      {trend && (
        <div className="flex items-center gap-2 mt-2">
          <span className="flex items-center gap-0.5 text-xs font-semibold text-green-700 bg-green-50 rounded-full px-2 py-0.5">
            {trend}
          </span>
          <span className="text-xs text-gray-400">{trendLabel}</span>
        </div>
      )}
    </div>
  );
}
