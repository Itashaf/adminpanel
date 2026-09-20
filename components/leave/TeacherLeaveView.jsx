'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiPlus, FiCalendar } from 'react-icons/fi';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
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

function ApplyLeaveModal({ isOpen, onClose, onSuccess }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

function LeaveRow({ leave }) {
  const dateLabel =
    leave.endDate !== leave.startDate ? `${formatDate(leave.startDate)} – ${formatDate(leave.endDate)}` : formatDate(leave.startDate);

  return (
    <div className="px-4 sm:px-5 py-4 border-b border-gray-100 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900">{leave.leaveType} Leave</p>
            <LeaveStatusBadge status={leave.status} />
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
      </div>
    </div>
  );
}

export default function TeacherLeaveView({ leaves }) {
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Leave</h1>
          <p className="text-sm text-gray-500 mt-1">Apply for leave and track your requests.</p>
        </div>
        <Button label="Apply for Leave" icon={<FiPlus className="w-4 h-4" />} onClick={() => setShowModal(true)} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {leaves.length === 0 ? (
          <div className="text-center py-16 px-6">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 text-gray-300 mb-3">
              <FiCalendar className="w-6 h-6" />
            </span>
            <p className="text-sm text-gray-500">No leave requests yet.</p>
          </div>
        ) : (
          leaves.map((leave) => <LeaveRow key={leave.id} leave={leave} />)
        )}
      </div>

      <ApplyLeaveModal isOpen={showModal} onClose={() => setShowModal(false)} onSuccess={handleSuccess} />
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}
