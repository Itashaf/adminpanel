'use client';

import { useState } from 'react';
import { FiClock, FiCheckCircle, FiPlay } from 'react-icons/fi';
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

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-full flex flex-col">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 shrink-0">
            <FiClock className="w-4 h-4" />
          </span>
          <h2 className="text-base font-bold text-gray-900">Attendance Status</h2>
        </div>
        <span
          className={`text-xs font-semibold rounded-full px-3 py-1 shrink-0 ${
            status.checkedIn ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
          }`}
        >
          {status.checkedIn ? `Checked in at ${formatTime(status.checkInAt)}` : "You haven't checked in today"}
        </span>
      </div>

      <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-5">
        <div className="min-w-0">
          <p className="text-2xl font-bold text-gray-900">{status.checkedIn ? 'Checked In' : 'Not Checked In'}</p>
          <p className="text-sm text-gray-500 mt-1">
            {status.checkedIn ? 'You are checked in for today.' : 'Check in to start your school day.'}
          </p>
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>

        {status.checkedIn ? (
          <span className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-medium text-green-700 bg-green-50 shrink-0">
            <FiCheckCircle className="w-4 h-4" />
            Checked In
          </span>
        ) : (
          <button
            type="button"
            onClick={handleCheckIn}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer disabled:opacity-60 shrink-0"
          >
            <FiPlay className="w-4 h-4" />
            {isSubmitting ? 'Checking in...' : 'Check In'}
          </button>
        )}
      </div>
    </div>
  );
}
