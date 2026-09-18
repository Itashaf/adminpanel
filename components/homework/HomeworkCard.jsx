'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiMoreVertical, FiEdit2, FiTrash2, FiUser, FiUsers, FiCalendar, FiClock, FiFileText, FiBook } from 'react-icons/fi';
import Badge from '@/components/Badge';
import DropdownMenu from '@/components/DropdownMenu';
import ConfirmDialog from '@/components/ConfirmDialog';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import HomeworkFormModal from './HomeworkFormModal';
import { getSubjectStyle } from '@/lib/homeworkSubjectStyles';
import { deleteHomework } from '@/lib/api';

// Same fixed column template for the header row (HomeworkExplorer.jsx) and
// every data row below — a real table, not flex boxes that drift out of
// alignment once one row's subject badge or class/section text is longer
// than another's.
export const HOMEWORK_GRID_COLS = '48px 40px minmax(0,1fr) 150px 150px 110px 90px 32px';

function postedDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function postedTime(iso) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-50 text-gray-400 shrink-0">
        <Icon className="w-4 h-4" />
      </span>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-800">{value}</p>
      </div>
    </div>
  );
}

// One row per homework item — clicking anywhere on the row opens a detail
// popup (see HomeworkDetailModal below) instead of expanding inline, since a
// row's own space is too narrow to show the full description comfortably.
export default function HomeworkCard({ homework, serialNumber, canManage, sessionOptions, defaultSession, currentUser }) {
  const router = useRouter();
  const [showDetail, setShowDetail] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const subjectStyle = getSubjectStyle(homework.subject);
  const SubjectIcon = subjectStyle.icon;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteHomework(homework.id);
      setShowConfirm(false);
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  };

  const menuItems = [
    { label: 'Edit Homework', icon: <FiEdit2 className="w-4 h-4" />, onClick: () => setShowEditModal(true) },
    { label: 'Delete Homework', icon: <FiTrash2 className="w-4 h-4" />, onClick: () => setShowConfirm(true), danger: true },
  ];

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setShowDetail(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setShowDetail(true);
          }
        }}
        style={{ gridTemplateColumns: HOMEWORK_GRID_COLS }}
        className="w-full hidden md:grid items-center gap-4 px-4 sm:px-5 py-4 text-left cursor-pointer hover:bg-gray-50/60 transition"
      >
        <span className="text-sm font-medium text-gray-400">{serialNumber}</span>

        <span className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0 bg-violet-50 text-violet-600">
          <FiFileText className="w-4.5 h-4.5" />
        </span>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{homework.title}</p>
          {homework.description && <p className="text-xs text-gray-500 truncate mt-0.5">{homework.description}</p>}
        </div>

        <div>
          <Badge label={homework.subject} variant={subjectStyle.badge} />
        </div>

        <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 rounded-full px-3 py-1 w-fit">
          <FiUsers className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="truncate">{homework.className} • Sec {homework.sectionName}</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
          <FiCalendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          {postedDate(homework.createdAt)}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <FiClock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          {postedTime(homework.createdAt)}
        </div>

        <div onClick={(e) => e.stopPropagation()}>{canManage && <DropdownMenu trigger={<FiMoreVertical className="w-4 h-4" />} items={menuItems} />}</div>
      </div>

      {/* Mobile: same content, stacked instead of gridded columns. */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setShowDetail(true)}
        className="w-full md:hidden flex items-start gap-3 px-4 py-3 text-left cursor-pointer hover:bg-gray-50/60 transition"
      >
        <span className="text-xs font-medium text-gray-400 mt-1 w-5 shrink-0">{serialNumber}</span>
        <span className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0 bg-violet-50 text-violet-600">
          <FiFileText className="w-4.5 h-4.5" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{homework.title}</p>
          {homework.description && <p className="text-xs text-gray-500 truncate mt-0.5">{homework.description}</p>}
          <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
            <Badge label={homework.subject} variant={subjectStyle.badge} />
            <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 rounded-full px-2.5 py-1">
              <FiUsers className="w-3 h-3" />
              {homework.className} • Sec {homework.sectionName}
            </span>
          </div>
        </div>
        {canManage && (
          <span onClick={(e) => e.stopPropagation()} className="shrink-0">
            <DropdownMenu trigger={<FiMoreVertical className="w-4 h-4" />} items={menuItems} />
          </span>
        )}
      </div>

      <Modal
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        title={homework.title}
        icon={<FiBook className="w-5 h-5" />}
      >
        <div className="space-y-5">
          {homework.description && (
            <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-xl p-4">{homework.description}</p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <DetailRow icon={SubjectIcon} label="Subject" value={homework.subject} />
            <DetailRow icon={FiUsers} label="Class & Section" value={`${homework.className} • Sec ${homework.sectionName}`} />
            <DetailRow icon={FiUser} label="Assigned By" value={homework.assignedByName} />
            <DetailRow icon={FiCalendar} label="Posted" value={`${postedDate(homework.createdAt)}, ${postedTime(homework.createdAt)}`} />
          </div>
        </div>
      </Modal>

      <HomeworkFormModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        homework={homework}
        sessionOptions={sessionOptions}
        defaultSession={defaultSession}
        currentUser={currentUser}
        onSuccess={(message) => {
          setShowEditModal(false);
          setToastMessage(message);
          router.refresh();
        }}
      />

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        title="Delete homework?"
        description={`"${homework.title}" will be permanently removed.`}
        confirmLabel="Delete"
        isLoading={isDeleting}
      />

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}
