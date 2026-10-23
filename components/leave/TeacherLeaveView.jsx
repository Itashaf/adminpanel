'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiPlus, FiCalendar } from 'react-icons/fi';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import ParentKPICard from '@/components/parent/ParentKPICard';
import Dropdown from '@/components/Dropdown';
import DatePicker from '@/components/DatePicker';
import Toast from '@/components/Toast';
import LeaveStatusBadge from './LeaveStatusBadge';
import { applyForLeaveRequest } from '@/lib/api';
import { LEAVE_TYPE_OPTIONS } from '@/lib/leaveConstants';

function formatDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

const EMPTY_FORM = { leaveType: 'Casual', startDate: '', endDate: '', reason: '' };

function ApplyLeaveModal({ isOpen, onClose, onSuccess, balance }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const balanceForType = balance.find((b) => b.leaveType === form.leaveType);

  const handleClose = () => {
    setForm(EMPTY_FORM);
    setError('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.startDate || !form.endDate || !form.reason.trim()) {
      setError('Start date, end date and reason are required.');
      return;
    }
    setIsSubmitting(true);
    try {
      await applyForLeaveRequest(form);
      setForm(EMPTY_FORM);
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      title="Apply for Leave"
      icon={<FiCalendar className="w-5 h-5" />}
      isOpen={isOpen}
      onClose={handleClose}
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button label="Cancel" variant="secondary" onClick={handleClose} />
          <Button label={isSubmitting ? 'Submitting...' : 'Submit Request'} type="submit" form="apply-leave-form" disabled={isSubmitting} />
        </div>
      }
    >
      <form id="apply-leave-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Leave Type</label>
          <Dropdown options={LEAVE_TYPE_OPTIONS} value={form.leaveType} onChange={(v) => setForm({ ...form, leaveType: v })} />
          {balanceForType && (
            <p className="text-xs text-gray-400 mt-1.5">
              {balanceForType.quota === null
                ? 'No annual limit for this leave type.'
                : `${balanceForType.remaining} of ${balanceForType.quota} day(s) remaining this year.`}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <DatePicker value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <DatePicker value={form.endDate} onChange={(v) => setForm({ ...form, endDate: v })} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
          <textarea
            rows={3}
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            placeholder="Reason for leave..."
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}
      </form>
    </Modal>
  );
}

function dayCount(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  return Math.round((end - start) / 86400000) + 1;
}

function dateLabelFor(leave) {
  return leave.endDate !== leave.startDate ? `${formatDate(leave.startDate)} – ${formatDate(leave.endDate)}` : formatDate(leave.startDate);
}

function reviewLabelFor(leave) {
  if (leave.status === 'Pending') return 'Awaiting review';
  return `${leave.status} by ${leave.reviewedByName || 'Admin'}${leave.reviewNote ? ` — ${leave.reviewNote}` : ''}`;
}

// Mobile-only list row — the table below takes over from md up.
function LeaveRow({ leave }) {
  const days = dayCount(leave.startDate, leave.endDate);
  return (
    <div className="px-5 py-4 border-b border-gray-100 last:border-b-0">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-gray-900">{leave.leaveType} Leave</p>
        <LeaveStatusBadge status={leave.status} />
      </div>
      <p className="text-sm text-gray-500 mt-1">
        {dateLabelFor(leave)} · {days} day{days > 1 ? 's' : ''}
      </p>
      <p className="text-sm text-gray-600 mt-2">{leave.reason}</p>
      <p className="text-xs text-gray-400 mt-2">{reviewLabelFor(leave)}</p>
    </div>
  );
}

export default function TeacherLeaveView({ leaves, balance = [] }) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleSuccess = () => {
    setShowModal(false);
    setToastMessage('Leave request submitted.');
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Leave</h1>
          <p className="text-base text-gray-500 mt-1.5">Apply for leave and track your requests.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer shrink-0"
        >
          <FiPlus className="w-4 h-4" />
          Apply for Leave
        </button>
      </div>

      {balance.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {balance.map((b) => {
            const isUnlimited = b.quota === null;
            return (
              <ParentKPICard
                key={b.leaveType}
                label={`${b.leaveType} Leave`}
                icon={<FiCalendar className="w-5 h-5" />}
                value={isUnlimited ? 'Unlimited' : `${b.remaining} / ${b.quota}`}
                context={`${b.usedApproved} used${b.usedPending > 0 ? `, ${b.usedPending} pending` : ''}`}
                dotClassName={b.usedPending > 0 ? 'bg-amber-400' : 'bg-green-400'}
              />
            );
          })}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {leaves.length === 0 ? (
          <div className="text-center py-16 px-6">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 text-gray-300 mb-3">
              <FiCalendar className="w-6 h-6" />
            </span>
            <p className="text-sm text-gray-500">No leave requests yet.</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="py-4 pl-6 pr-4 w-16">S.No.</th>
                    <th className="py-4 pr-4">Leave Type</th>
                    <th className="py-4 pr-4">Date</th>
                    <th className="py-4 pr-4">Days</th>
                    <th className="py-4 pr-4">Reason</th>
                    <th className="py-4 pr-4">Status</th>
                    <th className="py-4 pr-6">Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leaves.map((leave, index) => (
                    <tr key={leave.id} className="align-top hover:bg-gray-50/60 transition">
                      <td className="py-4 pl-6 pr-4 text-gray-500">{index + 1}</td>
                      <td className="py-4 pr-4 font-medium text-gray-900 whitespace-nowrap">{leave.leaveType} Leave</td>
                      <td className="py-4 pr-4 text-gray-700 whitespace-nowrap">{dateLabelFor(leave)}</td>
                      <td className="py-4 pr-4 text-gray-700">{dayCount(leave.startDate, leave.endDate)}</td>
                      <td className="py-4 pr-4 text-gray-700 whitespace-pre-wrap min-w-[200px]">{leave.reason}</td>
                      <td className="py-4 pr-4">
                        <LeaveStatusBadge status={leave.status} />
                      </td>
                      <td className="py-4 pr-6 text-gray-500 min-w-[160px]">{reviewLabelFor(leave)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden">
              {leaves.map((leave) => (
                <LeaveRow key={leave.id} leave={leave} />
              ))}
            </div>
          </>
        )}
      </div>

      <ApplyLeaveModal isOpen={showModal} onClose={() => setShowModal(false)} onSuccess={handleSuccess} balance={balance} />
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}
