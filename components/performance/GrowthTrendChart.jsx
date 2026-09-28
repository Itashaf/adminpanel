// Same SVG-polyline technique as AttendanceTrendChart.jsx, simplified (no
// granularity toggle — a school year has at most ~12 points already).
// `trend` is `[{ month: 'YYYY-MM', academicPercent }]`, one point per
// month that has a MonthlyReport.
const WIDTH = 480;
const HEIGHT = 180;
const PADDING = { top: 10, right: 10, bottom: 22, left: 30 };

function monthShortLabel(month) {
  const [year, m] = month.split('-');
  return new Date(Number(year), Number(m) - 1, 1).toLocaleDateString('en-US', { month: 'short' });
}

export default function GrowthTrendChart({ trend }) {
  const innerWidth = WIDTH - PADDING.left - PADDING.right;
  const innerHeight = HEIGHT - PADDING.top - PADDING.bottom;

  const coords = trend.map((p, i) => ({
    x: PADDING.left + (trend.length > 1 ? (i / (trend.length - 1)) * innerWidth : innerWidth / 2),
    y: PADDING.top + innerHeight - (p.academicPercent / 100) * innerHeight,
    ...p,
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  const areaPath = coords.length
    ? `${linePath} L ${coords[coords.length - 1].x} ${PADDING.top + innerHeight} L ${coords[0].x} ${PADDING.top + innerHeight} Z`
    : '';

  if (coords.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-12">No monthly reports yet this session.</p>;
  }

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {[0, 25, 50, 75, 100].map((tick) => {
        const y = PADDING.top + innerHeight - (tick / 100) * innerHeight;
        return (
          <g key={tick}>
            <line x1={PADDING.left} y1={y} x2={WIDTH - PADDING.right} y2={y} stroke="#f3f4f6" strokeWidth={1} />
            <text x={PADDING.left - 6} y={y + 3} textAnchor="end" fontSize={9} fill="#9ca3af">
              {tick}
            </text>
          </g>
        );
      })}

      <path d={areaPath} fill="#7C3AED" fillOpacity={0.08} stroke="none" />
      <path d={linePath} fill="none" stroke="#7C3AED" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

      {coords.map((c) => (
        <circle key={c.month} cx={c.x} cy={c.y} r={3} fill="#7C3AED" />
      ))}

      {coords.map((c) => (
        <text key={`label-${c.month}`} x={c.x} y={HEIGHT - 6} textAnchor="middle" fontSize={9} fill="#9ca3af">
          {monthShortLabel(c.month)}
        </text>
      ))}
    </svg>
  );
}
