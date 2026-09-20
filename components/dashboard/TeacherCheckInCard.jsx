'use client';

import { useState } from 'react';
import { FiClock, FiCheckCircle } from 'react-icons/fi';
import { checkInForToday } from '@/lib/api';

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function TeacherCheckInCard({ initialStatus }) {
  const [status, setStatus] = useState(initialStatus);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleCheckIn = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      const result = await checkInForToday();
      setStatus({ checkedIn: true, checkInAt: result.checkInAt, status: result.status });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status.checkedIn) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-green-50 border border-green-100 px-5 py-4">
        <span className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 text-green-600 shrink-0">
          <FiCheckCircle className="w-5 h-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-green-800">Checked in for today</p>
          <p className="text-xs text-green-600 mt-0.5">at {formatTime(status.checkInAt)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl bg-white border border-gray-100 shadow-sm px-5 py-4">
      <div className="flex items-center gap-3">
        <span className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 text-amber-600 shrink-0">
          <FiClock className="w-5 h-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-gray-900">You haven't checked in today</p>
          {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
        </div>
      </div>
      <button
        type="button"
        onClick={handleCheckIn}
        disabled={isSubmitting}
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer disabled:opacity-60 shrink-0"
      >
        {isSubmitting ? 'Checking in...' : 'Check In'}
      </button>
    </div>
  );
}
