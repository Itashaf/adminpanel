'use client';

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import Modal from '@/components/Modal';
import { FiUsers } from 'react-icons/fi';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

// Total Students KPI card's "View Classwise" CTA — real per-class headcount
// (lib/dashboard.js's classWiseStudents, every active class, not a fixed
// subset) charted with Chart.js, same pattern as FeeCollectionChart.jsx /
// AttendanceCollectionChart.jsx.
export default function ClassWiseStudentsModal({ isOpen, onClose, classWise }) {
  const data = {
    labels: classWise.map((c) => c.name),
    datasets: [
      { label: 'Students', data: classWise.map((c) => c.count), backgroundColor: '#2563EB', borderRadius: 6, maxBarThickness: 36 },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.y} students` } },
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#f3f4f6' } },
    },
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Students by Class"
      description="Real enrolled headcount for every active class."
      icon={<FiUsers className="w-5 h-5" />}
      size="lg"
    >
      {classWise.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">No active classes yet.</p>
      ) : (
        <div className="h-72">
          <Bar data={data} options={options} />
        </div>
      )}
    </Modal>
  );
}
