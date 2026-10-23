'use client';

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import Modal from '@/components/Modal';
import { FiCreditCard } from 'react-icons/fi';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

// Pending Fees KPI card's "View Classwise" CTA — same pattern as
// ClassWiseStudentsModal.jsx, just money (lib/fees.js's
// getClasswisePendingFees, discount + late fee aware) instead of headcount.
export default function ClasswisePendingFeesModal({ isOpen, onClose, classwise }) {
  const data = {
    labels: classwise.map((c) => c.name),
    datasets: [
      { label: 'Pending', data: classwise.map((c) => c.totalDue), backgroundColor: '#DC2626', borderRadius: 6, maxBarThickness: 36 },
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
            return `₹${row.totalDue.toLocaleString('en-IN')} — ${row.studentCount} student${row.studentCount === 1 ? '' : 's'}`;
          },
        },
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, ticks: { callback: (v) => `₹${v.toLocaleString('en-IN')}` }, grid: { color: '#f3f4f6' } },
    },
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pending Fees by Class"
      description="Real outstanding balance per class, across every student who owes money."
      icon={<FiCreditCard className="w-5 h-5" />}
      size="lg"
    >
      {classwise.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">No pending fees — every student is fully paid up.</p>
      ) : (
        <div className="h-72">
          <Bar data={data} options={options} />
        </div>
      )}
    </Modal>
  );
}
