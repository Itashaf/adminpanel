'use client';

import { useState } from 'react';
import { FiCheckSquare, FiArrowRight } from 'react-icons/fi';
import KPICard from './KPICard';
import ClasswiseAttendanceModal from './ClasswiseAttendanceModal';

// Students Attendance KPI card + its "View Classwise" CTA — same Client
// Component wrapper pattern as TotalStudentsKPICard.jsx / PendingFeesKPICard.jsx.
export default function AttendanceKPICard({ value, pillLabel, classwise }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <KPICard
        label="Students Attendance"
        icon={<FiCheckSquare className="w-4 h-4" />}
        value={value}
        pillLabel={pillLabel}
        footer={
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-1 text-xs font-semibold text-white/90 hover:text-white cursor-pointer"
          >
            View Classwise
            <FiArrowRight className="w-3 h-3" />
          </button>
        }
      />
      <ClasswiseAttendanceModal isOpen={isOpen} onClose={() => setIsOpen(false)} classwise={classwise} />
    </>
  );
}
