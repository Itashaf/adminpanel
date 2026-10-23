const CARD_BG = 'bg-gradient-to-br from-purple-800 via-indigo-800 to-[#2563EB]';

// Parent dashboard's KPI tile — same gradient as components/dashboard/KPICard.jsx
// (admin), just larger/rounder with a sentence-case label and a colored dot
// before the context line, per the Parent Portal design.
export default function ParentKPICard({ label, icon, value, context, dotClassName = 'bg-green-400' }) {
  return (
    <div className={`rounded-[20px] shadow-sm px-6 py-5 text-white transition-shadow duration-200 hover:shadow-md ${CARD_BG}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-white/80">{label}</p>
        <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-white/15 text-white shrink-0">{icon}</span>
      </div>
      <p className="text-4xl font-bold tabular-nums tracking-tight leading-tight mt-1">{value}</p>
      <p className="flex items-center gap-2 text-sm text-white/85 mt-4">
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotClassName}`} />
        <span className="truncate">{context}</span>
      </p>
    </div>
  );
}
