'use client';

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import Modal from '@/components/Modal';
import { FiCheckSquare } from 'react-icons/fi';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

// Students Attendance KPI card's "View Classwise" CTA — today's real
// per-class attendance percent (lib/dashboard.js's classWiseAttendanceToday,
// via lib/attendance.js's getClassAttendancePerformance), same Bar-chart
// pattern as ClassWiseStudentsModal.jsx / ClasswisePendingFeesModal.jsx.
export default function ClasswiseAttendanceModal({ isOpen, onClose, classwise }) {
  // Every active class is always present (even at 0%, see
  // lib/dashboard.js's classWiseAttendanceToday) — so "nothing to show" means
  // nobody's marked anything yet today, not merely an empty list.
  const hasAnyAttendance = classwise.some((c) => c.total > 0);
  const data = {
    labels: classwise.map((c) => c.className),
    datasets: [
      { label: 'Present %', data: classwise.map((c) => c.percent), backgroundColor: '#2563EB', borderRadius: 6, maxBarThickness: 36 },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const row = classwise[ctx.dataIndex];
            return `${row.percent}% — ${row.Present}/${row.total - row.NA} present`;
          },
        },
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, max: 100, ticks: { callback: (v) => `${v}%` }, grid: { color: '#f3f4f6' } },
    },
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Today's Attendance by Class"
      description="Real attendance percent marked so far today, per active class."
      icon={<FiCheckSquare className="w-5 h-5" />}
      size="lg"
    >
      {!hasAnyAttendance ? (
        <div className="h-72 flex items-center justify-center">
          <p className="text-sm text-gray-400">No attendance for today.</p>
        </div>
      ) : (
        <div className="h-72">
          <Bar data={data} options={options} />
        </div>
      )}
    </Modal>
  );
}
