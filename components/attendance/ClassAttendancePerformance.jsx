'use client';

import { useState } from 'react';
import { FiChevronRight } from 'react-icons/fi';

const VISIBLE_COUNT = 5;

function barColor(percent) {
  if (percent >= 90) return 'bg-green-600';
  if (percent >= 75) return 'bg-amber-500';
  return 'bg-red-500';
}

export default function ClassAttendancePerformance({ classes }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? classes : classes.slice(0, VISIBLE_COUNT);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h3 className="text-base font-bold text-gray-900">Class-wise Attendance</h3>

      {classes.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-16">No attendance data for the selected filters.</p>
      ) : (
        <>
          <div className="space-y-4 mt-5">
            {visible.map((cls) => (
              <div key={cls.className}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-gray-700">{cls.className}</span>
                  <span className="font-semibold text-gray-900">{cls.percent}%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${barColor(cls.percent)}`}
                    style={{ width: `${Math.min(100, cls.percent)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {classes.length > VISIBLE_COUNT && (
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className="flex items-center gap-1 text-sm font-medium text-indigo-700 hover:text-indigo-900 cursor-pointer mt-5"
            >
              {showAll ? 'Show Less' : 'View All Classes'}
              <FiChevronRight className={`w-3.5 h-3.5 transition-transform ${showAll ? '-rotate-90' : ''}`} />
            </button>
          )}
        </>
      )}
    </div>
  );
}
