'use client';

import { useEffect, useState } from 'react';
import { FiCalendar } from 'react-icons/fi';
import Toast from '@/components/Toast';
import ParentFeeTermCard from '@/components/parent/ParentFeeTermCard';
import { FEE_TERMS } from '@/lib/feeConstants';
import { getStudentFees } from '@/lib/api';

// The Parent Portal's own equivalent of components/students/StudentFeesTab.jsx
// — same layout and StudentFeeTermCard, but a parent can only ever pay
// online (canPayOnline), never record a manual cash/UPI/bank-transfer
// collection (canCollect stays false — that's an admin/front-office action).
export default function ParentFeesView({ student }) {
  const [fees, setFees] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError('');
    getStudentFees(student.id, student.academicSession)
      .then((data) => {
        if (!cancelled) setFees(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [student.id, student.academicSession]);

  const feeByTerm = new Map((fees || []).map((fee) => [fee.term, fee]));

  const handlePaid = (updatedFee, message) => {
    setFees((prev) => (prev || []).map((fee) => (fee.id === updatedFee.id ? { ...fee, ...updatedFee } : fee)));
    setToastMessage(message);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {student.firstName} {student.lastName}&apos;s Fees
          </h1>
          <p className="text-base text-gray-500 mt-1.5">
            {student.class}
            {student.section ? ` - ${student.section}` : ''} · Session {student.academicSession}
          </p>
        </div>
        <span className="inline-flex items-center gap-2.5 bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 text-sm font-semibold text-gray-900">
          <FiCalendar className="w-[18px] h-[18px] text-indigo-600" />
          Academic Year {student.academicSession}
        </span>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-pulse">
          {FEE_TERMS.map((t) => (
            <div key={t} className="h-60 bg-white border border-gray-100 shadow-sm rounded-[24px] overflow-hidden">
              <div className="h-[68px] bg-gray-200" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && error && <p className="text-sm text-red-500 text-center py-10">{error}</p>}

      {!isLoading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          {FEE_TERMS.map((term) => (
            <ParentFeeTermCard
              key={term}
              term={term}
              fee={feeByTerm.get(term) || null}
              studentName={`${student.firstName} ${student.lastName}`}
              contact={student.guardian?.phone || student.whatsappNumber}
              email={student.guardian?.email}
              onPaid={handlePaid}
            />
          ))}
        </div>
      )}

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}
