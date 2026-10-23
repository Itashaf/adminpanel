// "KPI Card" — saved design (see design.md §3). Filled gradient card using
// the Sidebar's own dark shell colors (from-purple-950 to-indigo-950)
// blended into the brand "light"/active-pill color (#2563EB) — same dark +
// light combination as the Sidebar itself, rather than a per-metric hue.
// Tinted-translucent icon up top, a big white number with an inline
// real-figure pill beside it, a context line below.
const CARD_BG = 'bg-gradient-to-br from-purple-800 via-indigo-800 to-[#2563EB]';

// `footer` — optional extra node below the context line (e.g. a "View
// Classwise" CTA that opens a popup) — callers that don't pass it keep the
// card exactly as before. Since any onClick handler needs client state, the
// caller passing `footer` is itself a Client Component; KPICard stays a
// plain, dumb presentational component either way.
// `valueClassName` — size of the main value; defaults to the big number style,
// pass a smaller one when the value is text (e.g. an email) rather than a count.
export default function KPICard({ label, icon, value, pillLabel, context, footer, valueClassName = 'text-3xl' }) {
  return (
    <div className={`rounded-xl shadow-sm p-5 transition-shadow duration-200 hover:shadow-md ${CARD_BG}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-white/70 uppercase tracking-wide">{label}</p>
        <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/15 text-white shrink-0">{icon}</span>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <div className={`min-w-0 font-bold text-white tabular-nums tracking-tight leading-tight ${valueClassName}`}>{value}</div>
        {pillLabel && (
          <span className="text-xs font-semibold rounded-full px-2 py-0.5 bg-white/20 text-white">{pillLabel}</span>
        )}
      </div>
      {/* Context + footer share one row when both exist (e.g. Pending Fees'
          student count + "View Classwise") instead of stacking on separate
          lines — each still renders alone exactly as before when only one
          of them is passed. */}
      {context && !footer && <p className="text-xs font-semibold text-white/90 mt-1">{context}</p>}
      {footer && !context && <div className="mt-2">{footer}</div>}
      {context && footer && (
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs font-semibold text-white/90">{context}</p>
          {footer}
        </div>
      )}
    </div>
  );
}
