'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiCalendar, FiCheck, FiX } from 'react-icons/fi';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import Toast from '@/components/Toast';
import LeaveStatusBadge from './LeaveStatusBadge';
import { reviewLeave } from '@/lib/api';
import { LEAVE_STATUS_FILTER_PILLS } from '@/lib/leaveConstants';

function formatDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function RejectModal({ leave, onClose, onConfirm }) {
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    await onConfirm(leave.id, 'Rejected', note);
    setIsSubmitting(false);
  };

  return (
    <Modal
      title="Reject Leave Request"
      icon={<FiX className="w-5 h-5" />}
      isOpen={Boolean(leave)}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button label="Cancel" variant="secondary" onClick={onClose} />
          <Button label={isSubmitting ? 'Rejecting...' : 'Reject Request'} onClick={handleConfirm} disabled={isSubmitting} />
        </div>
      }
    >
      <label className="block text-sm font-medium text-gray-700 mb-2">Reason (optional)</label>
      <textarea
        rows={3}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Let the teacher know why..."
        className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </Modal>
  );
}

function LeaveRow({ leave, onApprove, onReject, balanceForType }) {
  const dateLabel =
    leave.endDate !== leave.startDate ? `${formatDate(leave.startDate)} – ${formatDate(leave.endDate)}` : formatDate(leave.startDate);

  return (
    <div className="px-4 sm:px-5 py-4 border-b border-gray-100 last:border-b-0">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900">{leave.teacherName}</p>
            <span className="text-xs text-gray-400">{leave.leaveType}</span>
            <LeaveStatusBadge status={leave.status} />
            {balanceForType && balanceForType.quota !== null && (
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  balanceForType.remaining <= 0 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'
                }`}
                title={`${leave.leaveType} leave used this year (Approved + Pending)`}
              >
                {balanceForType.remaining}/{balanceForType.quota} left this year
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">{dateLabel}</p>
          <p className="text-sm text-gray-600 mt-2">{leave.reason}</p>
          {leave.status !== 'Pending' && (
            <p className="text-xs text-gray-400 mt-2">
              {leave.status} by {leave.reviewedByName || 'Admin'}
              {leave.reviewNote ? ` — ${leave.reviewNote}` : ''}
            </p>
          )}
        </div>

        {leave.status === 'Pending' && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onApprove(leave.id)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 transition cursor-pointer"
            >
              <FiCheck className="w-3.5 h-3.5" />
              Approve
            </button>
            <button
              type="button"
              onClick={() => onReject(leave)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition cursor-pointer"
            >
              <FiX className="w-3.5 h-3.5" />
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminLeaveView({ leaves, balanceByTeacher = {} }) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState('');
  const [rejectingLeave, setRejectingLeave] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const filtered = useMemo(
    () => leaves.filter((l) => !statusFilter || l.status === statusFilter),
    [leaves, statusFilter]
  );

  const handleReview = async (id, status, reviewNote = '') => {
    try {
      await reviewLeave(id, status, reviewNote);
      setRejectingLeave(null);
      setToastMessage(status === 'Approved' ? 'Leave request approved.' : 'Leave request rejected.');
      router.refresh();
    } catch (err) {
      setToastMessage(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Leave Requests</h1>
        <p className="text-sm text-gray-500 mt-1">Review and respond to teacher leave applications.</p>
      </div>

      <div className="flex items-center gap-1.5 bg-gray-100 rounded-full p-1 w-fit">
        {LEAVE_STATUS_FILTER_PILLS.map((pill) => (
          <button
            key={pill.value}
            type="button"
            onClick={() => setStatusFilter(pill.value)}
            className={`px-4 py-2 rounded-full text-xs font-semibold cursor-pointer transition ${
              statusFilter === pill.value ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 px-6">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 text-gray-300 mb-3">
              <FiCalendar className="w-6 h-6" />
            </span>
            <p className="text-sm text-gray-500">No leave requests found.</p>
          </div>
        ) : (
          filtered.map((leave) => (
            <LeaveRow
              key={leave.id}
              leave={leave}
              onApprove={(id) => handleReview(id, 'Approved')}
              onReject={setRejectingLeave}
              balanceForType={(balanceByTeacher[leave.teacherId] || []).find((b) => b.leaveType === leave.leaveType)}
            />
          ))
        )}
      </div>

      <RejectModal leave={rejectingLeave} onClose={() => setRejectingLeave(null)} onConfirm={handleReview} />
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}
