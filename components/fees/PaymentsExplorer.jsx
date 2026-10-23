'use client';

import { useEffect, useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import Dropdown from '@/components/Dropdown';
import Input from '@/components/Input';
import FixedPaginationBar from '@/components/FixedPaginationBar';
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
  { value: 'REVERSED', label: 'Reversed' },
];

const PAGE_SIZE = 10;

export default function PaymentsExplorer({ initialResult }) {
  const [method, setMethod] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(initialResult);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    const timeout = setTimeout(() => {
      getPayments({ search, method, status, page, pageSize: PAGE_SIZE })
        .then((data) => {
          if (!cancelled) setResult(data);
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, method, status, page]);

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  return (
    <div className="space-y-4 pb-12">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="shrink-0">
          <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
          <p className="text-sm text-gray-500 mt-1">Every fee payment collected, manual or online.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
        <div className="w-full sm:w-96">
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name or transaction ID..."
            icon={<FiSearch />}
            className="bg-white text-sm"
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
      </div>

      <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${isLoading ? 'opacity-60' : ''}`}>
        {result.payments.length > 0 ? (
          <PaymentsTable payments={result.payments} startIndex={(page - 1) * PAGE_SIZE} />
        ) : (
          <p className="text-sm text-gray-500 text-center py-16">No payments match these filters.</p>
        )}
      </div>

      <FixedPaginationBar
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalCount={result.total}
        pageSize={PAGE_SIZE}
        itemLabel="payments"
      />
    </div>
  );
}
