'use client';

import { useState } from 'react';
import { FiCreditCard, FiArrowRight } from 'react-icons/fi';
import StatCard from './StatCard';
import ClasswisePendingFeesModal from './ClasswisePendingFeesModal';

// Accountant dashboard's "Pending Fees" stat card + its "View Classwise" CTA
// — same Client Component wrapper pattern as PendingFeesKPICard.jsx, just
// over StatCard's variant="minimal" instead of KPICard.
export default function PendingFeesStatCard({ value, context, classwise }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <StatCard
        variant="minimal"
        accent="brand"
        label="Pending Fees"
        value={value}
        icon={<FiCreditCard className="w-5 h-5" />}
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
