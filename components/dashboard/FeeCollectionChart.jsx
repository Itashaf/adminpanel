'use client';

import { useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

function formatCurrency(amount) {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

const PERIODS = [
  { key: 'daily', label: 'Daily' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
];

// Real Collected vs Due series — see lib/fees.js's getFeeCollectionTrend for
// exactly what each figure means. `dailyData`/`monthlyData`/`yearlyData` are
// all server-computed and passed in already built; this just toggles which
// one is charted, no client-side fetch. Built with Chart.js/react-chartjs-2
// rather than the app's existing hand-rolled DonutChart/StepLine SVGs, per
// explicit request.
export default function FeeCollectionChart({ dailyData, monthlyData, yearlyData }) {
  const [period, setPeriod] = useState('monthly');
  const rows = period === 'daily' ? dailyData : period === 'yearly' ? yearlyData : monthlyData;

  const data = {
    labels: rows.map((r) => r.label),
    datasets: [
      { label: 'Collected', data: rows.map((r) => r.collected), backgroundColor: '#10b981', borderRadius: 6, maxBarThickness: 36 },
      { label: 'Due', data: rows.map((r) => r.due), backgroundColor: '#ef4444', borderRadius: 6, maxBarThickness: 36 },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}` } },
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, ticks: { callback: (value) => formatCurrency(value) }, grid: { color: '#f3f4f6' } },
    },
  };

  return (
    <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h3 className="text-lg font-semibold text-gray-900">Fee Collection</h3>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Collected
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              Due
            </span>
          </div>

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
      </div>
      <div className="h-56">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}
