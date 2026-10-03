'use client';

import { useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const PERIODS = [
  { key: 'daily', label: 'Daily' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
];

// Real attendance % series — see lib/attendance.js's
// getAttendanceCollectionTrend for exactly what each figure means. Charts
// `percent` (not raw present/absent counts) since those counts are sums
// across every student × every day in a bucket and read as much bigger than
// the school's actual headcount — percent is the only figure that's
// comparable across Daily/Monthly/Yearly. `dailyData`/`monthlyData`/
// `yearlyData` are all server-computed and passed in already built; this
// just toggles which one is charted, no client-side fetch. Same Chart.js
// pattern as FeeCollectionChart.jsx.
export default function AttendanceCollectionChart({ dailyData, monthlyData, yearlyData }) {
  const [period, setPeriod] = useState('monthly');
  const rows = period === 'daily' ? dailyData : period === 'yearly' ? yearlyData : monthlyData;

  const data = {
    labels: rows.map((r) => r.label),
    datasets: [
      {
        label: 'Attendance %',
        data: rows.map((r) => r.percent),
        borderColor: '#2563EB',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        pointBackgroundColor: '#2563EB',
        pointRadius: 3,
        borderWidth: 2,
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.y}% present` } },
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, max: 100, ticks: { callback: (value) => `${value}%` }, grid: { color: '#f3f4f6' } },
    },
  };

  return (
    <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h3 className="text-lg font-semibold text-gray-900">Students Attendance Overview</h3>

        <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1">
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setPeriod(key)}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition ${
                period === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-56">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
