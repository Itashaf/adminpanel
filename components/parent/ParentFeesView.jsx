'use client';

import { useEffect, useState } from 'react';
import Toast from '@/components/Toast';
import StudentFeeTermCard from '@/components/fees/StudentFeeTermCard';
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {student.firstName} {student.lastName}'s Fees
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {student.class}{student.section ? ` - ${student.section}` : ''} · Session {student.academicSession}
        </p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse">
          {FEE_TERMS.map((t) => (
            <div key={t} className="h-52 bg-gray-50 rounded-2xl" />
          ))}
        </div>
      )}

      {!isLoading && error && <p className="text-sm text-red-500 text-center py-10">{error}</p>}

      {!isLoading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEE_TERMS.map((term) => (
            <StudentFeeTermCard
              key={term}
              term={term}
              fee={feeByTerm.get(term) || null}
              studentName={`${student.firstName} ${student.lastName}`}
              contact={student.guardian?.phone || student.whatsappNumber}
              email={student.guardian?.email}
              canCollect={false}
              canPayOnline
              onPaid={handlePaid}
            />
          ))}
        </div>
      )}

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}
