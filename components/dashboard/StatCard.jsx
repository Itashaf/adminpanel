import { FiArrowUpRight, FiArrowDownRight } from 'react-icons/fi';

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
  green: { iconBg: 'bg-green-100 text-green-600', bar: 'bg-green-400' },
  amber: { iconBg: 'bg-amber-100 text-amber-600', bar: 'bg-amber-400' },
  // Same gradient as WelcomeBanner/SchoolPulseCard's hero card — the whole
  // card carries it (cardBg), not just the icon tile, so it reads as
  // "belonging to" that theme without the hero itself being on the page
  // (see the Accountant dashboard). Icon tile and sparkline go translucent
  // white instead of their own color since they now sit on a dark card.
  brand: {
    cardBg: 'bg-gradient-to-br from-blue-600 to-violet-700 text-white',
    iconBg: 'bg-white/15 text-white',
    bar: 'bg-white',
  },
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
  // variant="rail" only — the real absolute delta (e.g. "+12") and its
  // label (e.g. "this month"), shown under the trend % pill.
  deltaValue,
  deltaLabel,
}) {
  if (variant === 'minimal') {
    const palette = ACCENTS[accent] || ACCENTS.blue;
    const isBrand = Boolean(palette.cardBg);
    return (
      <div
        className={`rounded-[24px] shadow-sm p-6 transition-all duration-200 hover:shadow-md ${
          isBrand ? palette.cardBg : 'bg-white border border-gray-100'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          {icon && (
            <span className={`flex items-center justify-center w-11 h-11 rounded-xl shrink-0 ${palette.iconBg}`}>{icon}</span>
          )}
          <Sparkline colorClass={palette.bar} />
        </div>
        <p className={`text-sm font-medium mt-4 ${isBrand ? 'text-white/80' : 'text-gray-500'}`}>{label}</p>
        <p className={`text-4xl font-bold tabular-nums tracking-tight leading-tight mt-1 ${isBrand ? 'text-white' : 'text-gray-900'}`}>
          {value}
        </p>
        {context && (
          <p className={`flex items-center gap-1.5 text-sm mt-2 ${isBrand ? 'text-white/70' : 'text-gray-400'}`}>
            <span
              className={`flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold shrink-0 ${
                isBrand
                  ? 'bg-white/20 text-white'
                  : contextTone === 'up'
                    ? 'bg-green-100 text-green-600'
                    : contextTone === 'down'
                      ? 'bg-red-100 text-red-600'
                      : 'bg-gray-100 text-gray-400'
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

  // "Rail Stat Card" — saved design, reuse via variant="rail". A thick
  // gradient rail down the left edge, big number + caption on the left,
  // a vertical divider, and a trend pill + real delta figure on the
  // right. `trendPercent`/`deltaValue` must be real computed figures
  // (e.g. lib/dashboard.js's pctChange) — never fabricated, same rule as
  // Sparkline above; omit them (leave null) rather than invent a number.
  if (variant === 'rail') {
    const isDown = contextTone === 'down';
    return (
      <div className="relative bg-white rounded-[24px] border border-gray-100 shadow-sm pl-7 pr-5 py-5 overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-blue-600 to-violet-700" />
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <p className="text-4xl font-extrabold text-gray-900 tracking-tight mt-1">{value}</p>
            {context && <p className="text-sm text-gray-400 mt-1">{context}</p>}
          </div>

          {(trend != null || deltaValue != null) && (
            <>
              <div className="self-stretch w-px bg-gray-100 shrink-0" />
              <div className="shrink-0 flex flex-col items-start gap-2">
                {trend != null && (
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-3 py-1 ${
                      isDown ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                    }`}
                  >
                    {isDown ? <FiArrowDownRight className="w-3 h-3" /> : <FiArrowUpRight className="w-3 h-3" />}
                    {trend}%
                  </span>
                )}
                {deltaValue != null && (
                  <div>
                    <p className={`text-lg font-bold ${deltaValue === '0+' ? 'text-gray-400' : isDown ? 'text-red-600' : 'text-green-600'}`}>
                      {deltaValue}
                    </p>
                    {deltaLabel && <p className="text-xs text-gray-400">{deltaLabel}</p>}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
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
