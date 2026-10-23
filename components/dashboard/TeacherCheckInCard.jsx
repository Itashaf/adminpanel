'use client';

import { useState } from 'react';
import { FiPlay } from 'react-icons/fi';
import { checkInForToday } from '@/lib/api';

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// Sits beside the greeting — the Check In button until the teacher has checked
// in, then a small "Checked in at ..." chip.
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
    <div>
      {status.checkedIn ? (
        <span className="inline-flex items-center rounded-full bg-green-50 px-5 py-2.5 text-sm font-medium text-green-700">
          Checked in at {formatTime(status.checkInAt)}
        </span>
      ) : (
        <button
          type="button"
          onClick={handleCheckIn}
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer disabled:opacity-60 shrink-0"
        >
          <FiPlay className="w-4 h-4" />
          {isSubmitting ? 'Checking in...' : 'Check In'}
        </button>
      )}
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  );
}
