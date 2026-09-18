'use client';

import { useMemo, useState } from 'react';
import Dropdown from '@/components/Dropdown';

const GRANULARITY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
];

const WIDTH = 480;
const HEIGHT = 200;
const PADDING = { top: 10, right: 10, bottom: 24, left: 30 };

function shortDateLabel(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

// Groups the daily series into 7-day buckets, averaging `percent` per bucket
// — no separate query for this, `trend` (one point per day already fetched)
// is all a weekly rollup needs.
function toWeekly(daily) {
  const weeks = [];
  for (let i = 0; i < daily.length; i += 7) {
    const chunk = daily.slice(i, i + 7);
    const avgPercent = Math.round((chunk.reduce((sum, d) => sum + d.percent, 0) / chunk.length) * 10) / 10;
    weeks.push({ date: chunk[0].date, percent: avgPercent });
  }
  return weeks;
}

export default function AttendanceTrendChart({ trend }) {
  const [granularity, setGranularity] = useState('daily');

  const points = useMemo(() => {
    const series = granularity === 'weekly' ? toWeekly(trend) : trend;
    return series.filter((d) => d.total > 0 || granularity === 'weekly');
  }, [trend, granularity]);

  const innerWidth = WIDTH - PADDING.left - PADDING.right;
  const innerHeight = HEIGHT - PADDING.top - PADDING.bottom;

  const coords = points.map((p, i) => ({
    x: PADDING.left + (points.length > 1 ? (i / (points.length - 1)) * innerWidth : innerWidth / 2),
    y: PADDING.top + innerHeight - (p.percent / 100) * innerHeight,
    ...p,
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  const areaPath = coords.length
    ? `${linePath} L ${coords[coords.length - 1].x} ${PADDING.top + innerHeight} L ${coords[0].x} ${PADDING.top + innerHeight} Z`
    : '';

  // Thin out x-axis labels so they don't overlap on a long daily range —
  // shows roughly 6 evenly-spaced ticks regardless of how many points there are.
  const labelStep = Math.max(1, Math.ceil(coords.length / 6));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-base font-bold text-gray-900">Attendance Trend</h3>
        <div className="w-28 shrink-0">
          <Dropdown options={GRANULARITY_OPTIONS} value={granularity} onChange={setGranularity} />
        </div>
      </div>

      {coords.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-16">No attendance data for the selected range.</p>
      ) : (
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

          <path d={areaPath} fill="#16a34a" fillOpacity={0.08} stroke="none" />
          <path d={linePath} fill="none" stroke="#16a34a" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {coords.map((c, i) => (
            <circle key={c.date} cx={c.x} cy={c.y} r={i % labelStep === 0 ? 2.5 : 0} fill="#16a34a" />
          ))}

          {coords.map(
            (c, i) =>
              i % labelStep === 0 && (
                <text key={`label-${c.date}`} x={c.x} y={HEIGHT - 6} textAnchor="middle" fontSize={9} fill="#9ca3af">
                  {shortDateLabel(c.date)}
                </text>
              )
          )}
        </svg>
      )}
    </div>
  );
}
