'use client';

import { useState } from 'react';
import { FiUsers, FiArrowRight } from 'react-icons/fi';
import KPICard from './KPICard';
import ClassWiseStudentsModal from './ClassWiseStudentsModal';

// Total Students KPI card + its "View Classwise" CTA — a Client Component
// wrapper since opening the popup needs local state; KPICard itself stays
// the plain, reusable presentational card every other dashboard uses.
export default function TotalStudentsKPICard({ value, classWise }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <KPICard
        label="Total Students"
        icon={<FiUsers className="w-4 h-4" />}
        value={value}
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
      <ClassWiseStudentsModal isOpen={isOpen} onClose={() => setIsOpen(false)} classWise={classWise} />
    </>
  );
}
