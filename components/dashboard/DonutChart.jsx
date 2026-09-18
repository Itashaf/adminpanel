// Generic multi-segment donut — `segments` is `[{ key, value, color }]`,
// drawn in order as consecutive arcs around the ring, sized to `total`.
// Used by OverallAttendanceDonut.jsx (Attendance Reports) for a
// Present/Absent/Leave breakdown of a real date-range summary.
export default function DonutChart({ total, segments, size = 160, strokeWidth = 20, centerValue, centerLabel }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeTotal = total > 0 ? total : 1;

  let offset = 0;
  const arcs = segments.map((segment) => {
    const length = (segment.value / safeTotal) * circumference;
    const arc = { ...segment, length, offset };
    offset += length;
    return arc;
  });

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f3f4f6" strokeWidth={strokeWidth} />
        {arcs
          .filter((arc) => arc.value > 0)
          .map((arc) => (
            <circle
              key={arc.key}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth={strokeWidth}
              strokeLinecap="butt"
              strokeDasharray={`${arc.length} ${circumference - arc.length}`}
              strokeDashoffset={-arc.offset}
            />
          ))}
      </svg>
      {(centerValue || centerLabel) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerValue && <p className="text-2xl font-bold text-gray-900 tabular-nums leading-tight">{centerValue}</p>}
          {centerLabel && <p className="text-xs text-gray-400">{centerLabel}</p>}
        </div>
      )}
    </div>
  );
}
