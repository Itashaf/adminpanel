'use client';

import { useEffect, useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import Dropdown from '@/components/Dropdown';
import Pagination from '@/components/Pagination';
import PaymentsTable from './PaymentsTable';
import { getPayments } from '@/lib/api';

const METHOD_OPTIONS = [
  { value: '', label: 'All Methods' },
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'RAZORPAY', label: 'Razorpay' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'SUCCESS', label: 'Success' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'FAILED', label: 'Failed' },
];

const PAGE_SIZE = 10;

export default function PaymentsExplorer({ initialResult, students }) {
  const [method, setMethod] = useState('');
  const [status, setStatus] = useState('');
  const [studentId, setStudentId] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(initialResult);
  const [isLoading, setIsLoading] = useState(false);

  const studentOptions = [{ value: '', label: 'All Students' }, ...students.map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName}` }))];

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getPayments({ studentId, method, status, page, pageSize: PAGE_SIZE })
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, method, status, page]);

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
        <p className="text-sm text-gray-500 mt-1">Every fee payment collected, manual or online.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Dropdown
            options={studentOptions}
            value={studentId}
            onChange={(v) => {
              setStudentId(v);
              setPage(1);
            }}
            placeholder="Filter by student"
            icon={<FiSearch />}
            searchable
          />
        </div>
        <div className="w-full sm:w-48">
          <Dropdown
            options={METHOD_OPTIONS}
            value={method}
            onChange={(v) => {
              setMethod(v);
              setPage(1);
            }}
          />
        </div>
        <div className="w-full sm:w-48">
          <Dropdown
            options={STATUS_OPTIONS}
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          />
        </div>
      </div>

      <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${isLoading ? 'opacity-60' : ''}`}>
        {result.payments.length > 0 ? (
          <PaymentsTable payments={result.payments} startIndex={(page - 1) * PAGE_SIZE} />
        ) : (
          <p className="text-sm text-gray-500 text-center py-16">No payments match these filters.</p>
        )}

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalCount={result.total} pageSize={PAGE_SIZE} />
          </div>
        )}
      </div>
    </div>
  );
}
