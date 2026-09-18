import DonutChart from '@/components/dashboard/DonutChart';
import { STATUS_META } from './statusStyles';

const SEGMENT_COLORS = { Present: '#16a34a', Absent: '#ef4444', Leave: '#3b82f6' };

function formatDateLabel(dateStr) {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function OverallAttendanceDonut({ summary, from, to }) {
  const segments = ['Present', 'Absent', 'Leave'].map((key) => ({
    key,
    value: summary[key],
    color: SEGMENT_COLORS[key],
  }));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h3 className="text-base font-bold text-gray-900">Overall Attendance</h3>
      <p className="text-xs text-gray-400 mt-0.5">
        Selected date range: {formatDateLabel(from)} – {formatDateLabel(to)}
      </p>

      <div className="flex flex-col items-center gap-6 mt-5">
        <DonutChart
          total={summary.total || 1}
          segments={segments}
          size={160}
          strokeWidth={20}
          centerValue={`${summary.percent}%`}
          centerLabel="Present"
        />

        <div className="w-full space-y-2.5">
          {['Present', 'Absent', 'Leave'].map((key) => {
            const meta = STATUS_META[key];
            const percent = summary.total > 0 ? Math.round((summary[key] / summary.total) * 1000) / 10 : 0;
            return (
              <div key={key} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 text-gray-600">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${meta.dot}`} />
                  {key}
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{summary[key]}</span>
                  <span className="text-xs text-gray-400 w-12 text-right">{percent}%</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
