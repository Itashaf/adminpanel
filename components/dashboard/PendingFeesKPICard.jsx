'use client';

import { useState } from 'react';
import { FiCreditCard, FiArrowRight } from 'react-icons/fi';
import KPICard from './KPICard';
import ClasswisePendingFeesModal from './ClasswisePendingFeesModal';

// Pending Fees KPI card + its "View Classwise" CTA — same Client Component
// wrapper pattern as TotalStudentsKPICard.jsx.
export default function PendingFeesKPICard({ value, context, classwise }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <KPICard
        label="Pending Fees"
        icon={<FiCreditCard className="w-4 h-4" />}
        value={value}
        context={context}
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
      <ClasswisePendingFeesModal isOpen={isOpen} onClose={() => setIsOpen(false)} classwise={classwise} />
    </>
  );
}
