'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FiCalendar,
  FiCheck,
  FiX,
  FiSearch,
  FiMail,
  FiPhone,
  FiUser,
  FiChevronRight,
  FiCoffee,
  FiThermometer,
  FiSun,
  FiFileText,
  FiClock,
} from 'react-icons/fi';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import Toast from '@/components/Toast';
import LeaveStatusBadge from './LeaveStatusBadge';
import { reviewLeave } from '@/lib/api';
import { LEAVE_TYPES, LEAVE_TYPE_STYLES } from '@/lib/leaveConstants';

const LEAVE_TYPE_ICONS = { FiCoffee, FiThermometer, FiSun, FiFileText };

function formatDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function dayCount(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  return Math.round((end - start) / 86400000) + 1;
}

function initialsFor(name) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

const AVATAR_COLORS = [
  'bg-violet-100 text-violet-700',
  'bg-blue-100 text-blue-700',
  'bg-amber-100 text-amber-700',
  'bg-green-100 text-green-700',
  'bg-pink-100 text-pink-700',
  'bg-cyan-100 text-cyan-700',
];

function avatarColorFor(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
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

function TeacherListRow({ teacher, isSelected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 last:border-b-0 text-left transition cursor-pointer ${
        isSelected ? 'bg-indigo-50/70' : 'hover:bg-gray-50'
      }`}
    >
      <span className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold shrink-0 ${avatarColorFor(teacher.teacherId)}`}>
        {initialsFor(teacher.teacherName)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900 truncate">{teacher.teacherName}</p>
        <p className="text-xs text-gray-400 truncate">{teacher.teacherRole || 'Teacher'}</p>
      </div>
      <span className="text-xs font-semibold text-red-600 bg-red-50 rounded-full px-2.5 py-1 whitespace-nowrap shrink-0">
        {teacher.leaves.length} pending
      </span>
      <FiChevronRight className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-500' : 'text-gray-300'}`} />
    </button>
  );
}

function LeaveRequestCard({ leave, balanceForType, onApprove, onReject }) {
  const typeStyle = LEAVE_TYPE_STYLES[leave.leaveType] || LEAVE_TYPE_STYLES.Other;
  const TypeIcon = LEAVE_TYPE_ICONS[typeStyle.icon] || FiFileText;
  const days = dayCount(leave.startDate, leave.endDate);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <span className={`flex items-center justify-center w-11 h-11 rounded-xl shrink-0 ${typeStyle.iconBg}`}>
            <TypeIcon className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-gray-900">{leave.leaveType} Leave</p>
              <LeaveStatusBadge status={leave.status} />
            </div>
            <p className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
              <FiCalendar className="w-3.5 h-3.5" />
              {formatDate(leave.startDate)}
              {leave.endDate !== leave.startDate ? ` – ${formatDate(leave.endDate)}` : ''} ({days} day{days > 1 ? 's' : ''})
            </p>
            <p className="text-sm text-gray-600 mt-2">{leave.reason}</p>
          </div>
        </div>

        {balanceForType && balanceForType.quota !== null && (
          <div className="flex items-center gap-2 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-xl px-3 py-2 shrink-0">
            <FiClock className="w-3.5 h-3.5" />
            <div>
              <p className="font-bold">
                {balanceForType.remaining}/{balanceForType.quota}
              </p>
              <p className="text-[10px] text-indigo-400">days left this year</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-400">Applied on {formatDate(leave.createdAt.slice(0, 10))}</p>
        {leave.status === 'Pending' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onApprove(leave.id)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 transition cursor-pointer"
            >
              <FiCheck className="w-3.5 h-3.5" />
              Approve
            </button>
            <button
              type="button"
              onClick={() => onReject(leave)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition cursor-pointer"
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
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState(null);
  const [rejectingLeave, setRejectingLeave] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  // 'pending' is this screen's whole point (see the teacher-grouped
  // master-detail layout below); 'history' is a lightweight fallback so
  // Approved/Rejected requests are still reachable somewhere, not lost.
  const [viewMode, setViewMode] = useState('pending');

  const pendingLeaves = useMemo(() => leaves.filter((l) => l.status === 'Pending'), [leaves]);
  const historyLeaves = useMemo(() => leaves.filter((l) => l.status !== 'Pending'), [leaves]);

  const typeCounts = useMemo(() => {
    const counts = { All: pendingLeaves.length };
    LEAVE_TYPES.forEach((t) => {
      counts[t] = pendingLeaves.filter((l) => l.leaveType === t).length;
    });
    return counts;
  }, [pendingLeaves]);

  // Grouped by teacher, filtered by type + search — a teacher only shows up
  // here while they have at least one Pending request matching the active
  // filters (approved/rejected history isn't part of this queue at all).
  const teacherGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = pendingLeaves.filter((l) => {
      const matchesType = !typeFilter || l.leaveType === typeFilter;
      const matchesSearch = !query || l.teacherName?.toLowerCase().includes(query);
      return matchesType && matchesSearch;
    });

    const byTeacher = new Map();
    filtered.forEach((leave) => {
      if (!byTeacher.has(leave.teacherId)) {
        byTeacher.set(leave.teacherId, {
          teacherId: leave.teacherId,
          teacherName: leave.teacherName,
          teacherRole: leave.teacherRole,
          teacherEmployeeId: leave.teacherEmployeeId,
          teacherEmail: leave.teacherEmail,
          teacherPhone: leave.teacherPhone,
          leaves: [],
        });
      }
      byTeacher.get(leave.teacherId).leaves.push(leave);
    });
    return [...byTeacher.values()];
  }, [pendingLeaves, search, typeFilter]);

  const selectedTeacher = teacherGroups.find((t) => t.teacherId === selectedTeacherId) || teacherGroups[0] || null;

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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-700 shrink-0">
            <FiCalendar className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pending Leave Requests</h1>
            <p className="text-sm text-gray-500 mt-0.5">Review and respond to teacher leave applications.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1">
            {[
              { key: 'pending', label: 'Pending' },
              { key: 'history', label: 'History' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setViewMode(tab.key)}
                className={`px-4 h-9 rounded-full text-sm font-semibold cursor-pointer transition ${
                  viewMode === tab.key ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-2.5">
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-100 text-amber-600 shrink-0">
              <FiClock className="w-4 h-4" />
            </span>
            <div>
              <p className="text-lg font-bold text-gray-900 leading-tight">{pendingLeaves.length}</p>
              <p className="text-[11px] text-amber-700 font-medium">Pending Requests</p>
            </div>
          </div>
        </div>
      </div>

      {viewMode === 'history' ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {historyLeaves.length === 0 ? (
            <div className="text-center py-16 px-6">
              <p className="text-sm text-gray-500">No reviewed requests yet.</p>
            </div>
          ) : (
            historyLeaves.map((leave) => {
              const typeStyle = LEAVE_TYPE_STYLES[leave.leaveType] || LEAVE_TYPE_STYLES.Other;
              const TypeIcon = LEAVE_TYPE_ICONS[typeStyle.icon] || FiFileText;
              return (
                <div key={leave.id} className="flex items-start gap-3 px-5 py-4 border-b border-gray-100 last:border-b-0">
                  <span className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${typeStyle.iconBg}`}>
                    <TypeIcon className="w-4 h-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900">{leave.teacherName}</p>
                      <span className="text-xs text-gray-400">{leave.leaveType} Leave</span>
                      <LeaveStatusBadge status={leave.status} />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(leave.startDate)}
                      {leave.endDate !== leave.startDate ? ` – ${formatDate(leave.endDate)}` : ''}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {leave.status} by {leave.reviewedByName || 'Admin'}
                      {leave.reviewNote ? ` — ${leave.reviewNote}` : ''}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 space-y-3">
            <div className="relative">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoComplete="off"
                placeholder="Search teachers..."
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[{ label: 'All', value: '' }, ...LEAVE_TYPES.map((t) => ({ label: t, value: t }))].map((pill) => (
                <button
                  key={pill.value}
                  type="button"
                  onClick={() => setTypeFilter(pill.value)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition ${
                    typeFilter === pill.value ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {pill.label}
                  <span className={typeFilter === pill.value ? 'text-indigo-200' : 'text-gray-400'}>
                    {typeCounts[pill.value || 'All']}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[560px] overflow-y-auto">
            {teacherGroups.length === 0 ? (
              <div className="text-center py-12 px-4">
                <p className="text-sm text-gray-400">No pending requests.</p>
              </div>
            ) : (
              teacherGroups.map((teacher) => (
                <TeacherListRow
                  key={teacher.teacherId}
                  teacher={teacher}
                  isSelected={selectedTeacher?.teacherId === teacher.teacherId}
                  onSelect={() => setSelectedTeacherId(teacher.teacherId)}
                />
              ))
            )}
          </div>
        </div>

        <div className="space-y-5">
          {!selectedTeacher ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-20">
              <p className="text-sm text-gray-400">Select a teacher to review their requests.</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <span
                    className={`flex items-center justify-center w-14 h-14 rounded-full text-lg font-bold shrink-0 ${avatarColorFor(
                      selectedTeacher.teacherId
                    )}`}
                  >
                    {initialsFor(selectedTeacher.teacherName)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-gray-900 truncate">{selectedTeacher.teacherName}</p>
                    <p className="text-sm text-gray-500 truncate">
                      {selectedTeacher.teacherRole || 'Teacher'}
                      {selectedTeacher.teacherEmployeeId ? ` • ${selectedTeacher.teacherEmployeeId}` : ''}
                    </p>
                    <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                      {selectedTeacher.teacherEmail && (
                        <span className="flex items-center gap-1.5 text-xs text-gray-400">
                          <FiMail className="w-3.5 h-3.5" />
                          {selectedTeacher.teacherEmail}
                        </span>
                      )}
                      {selectedTeacher.teacherPhone && (
                        <span className="flex items-center gap-1.5 text-xs text-gray-400">
                          <FiPhone className="w-3.5 h-3.5" />
                          {selectedTeacher.teacherPhone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Link
                  href={`/dashboard/teachers/${selectedTeacher.teacherId}`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition cursor-pointer shrink-0"
                >
                  <FiUser className="w-4 h-4" />
                  View Profile
                </Link>
              </div>

              <div>
                <h2 className="text-sm font-bold text-gray-900 mb-3">Pending Leave Requests ({selectedTeacher.leaves.length})</h2>
                <div className="space-y-4">
                  {selectedTeacher.leaves.map((leave) => (
                    <LeaveRequestCard
                      key={leave.id}
                      leave={leave}
                      balanceForType={(balanceByTeacher[leave.teacherId] || []).find((b) => b.leaveType === leave.leaveType)}
                      onApprove={(id) => handleReview(id, 'Approved')}
                      onReject={setRejectingLeave}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      )}

      <RejectModal leave={rejectingLeave} onClose={() => setRejectingLeave(null)} onConfirm={handleReview} />
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}
