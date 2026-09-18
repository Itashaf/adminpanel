'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiMoreVertical, FiEdit2, FiTrash2, FiUser, FiCalendar, FiUsers, FiPaperclip, FiBell } from 'react-icons/fi';
import Badge from '@/components/Badge';
import DropdownMenu from '@/components/DropdownMenu';
import ConfirmDialog from '@/components/ConfirmDialog';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import NoticeFormModal from './NoticeFormModal';
import { deleteNotice } from '@/lib/api';

const PRIORITY_VARIANTS = { Normal: 'gray', Important: 'amber', Urgent: 'red' };

function formatDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function NoticeAttachmentLink({ notice }) {
  if (!notice.attachmentUrl) return null;
  return (
    <a
      href={notice.attachmentUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium mt-2"
    >
      <FiPaperclip className="w-3.5 h-3.5" />
      {notice.attachmentName || 'Attachment.pdf'}
    </a>
  );
}

function audienceLabelFor(notice) {
  return notice.audience === 'Whole School'
    ? 'Whole School'
    : `${notice.className}${notice.sectionName ? ` • Sec ${notice.sectionName}` : ''}`;
}

function DetailChip({ icon: Icon, value }) {
  return (
    <span className="flex items-center gap-1 text-[11px] text-gray-500 bg-gray-50 rounded-full px-2 py-1 whitespace-nowrap">
      <Icon className="w-3 h-3 text-gray-400 shrink-0" />
      {value}
    </span>
  );
}

function NoticeDetailModal({ notice, isOpen, onClose }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={notice.title} icon={<FiBell className="w-5 h-5" />}>
      <div className="space-y-4">
        <div className="flex items-center flex-wrap gap-1.5">
          <DetailChip icon={FiUsers} value={audienceLabelFor(notice)} />
          <DetailChip icon={FiBell} value={notice.priority} />
          <DetailChip icon={FiUser} value={notice.postedByName} />
          <DetailChip icon={FiCalendar} value={formatDate(notice.createdAt)} />
        </div>

        <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-xl p-4">{notice.message}</p>
        <NoticeAttachmentLink notice={notice} />
      </div>
    </Modal>
  );
}

// The edit/delete affordance is identical for a notice whether it renders in
// the desktop table row or the mobile card — pulled out once so both layouts
// (each fully mounted, just CSS-hidden on the other breakpoint, same
// convention StudentsTable already uses) share one implementation instead of
// two copies of the same modal/confirm/toast wiring.
function NoticeRowActions({ notice, sessionOptions, defaultSession, currentUser }) {
  const router = useRouter();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteNotice(notice.id);
      setShowConfirm(false);
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  };

  const menuItems = [
    { label: 'Edit Notice', icon: <FiEdit2 className="w-4 h-4" />, onClick: () => setShowEditModal(true) },
    { label: 'Delete Notice', icon: <FiTrash2 className="w-4 h-4" />, onClick: () => setShowConfirm(true), danger: true },
  ];

  return (
    <>
      <span onClick={(e) => e.stopPropagation()}>
        <DropdownMenu trigger={<FiMoreVertical className="w-4 h-4" />} items={menuItems} />
      </span>

      <NoticeFormModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        notice={notice}
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
        title="Delete notice?"
        description={`"${notice.title}" will be permanently removed.`}
        confirmLabel="Delete"
        isLoading={isDeleting}
      />

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </>
  );
}

function NoticeTableRow({ notice, serialNumber, canManage, sessionOptions, defaultSession, currentUser }) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <>
      <tr onClick={() => setShowDetail(true)} className="hover:bg-gray-50/60 transition cursor-pointer">
        <td className="py-4 pl-6 pr-4 text-gray-400">{serialNumber}</td>
        <td className="py-4 pr-4">
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate max-w-md">{notice.title}</p>
            <p className="text-xs text-gray-400 truncate max-w-md">{notice.message}</p>
          </div>
        </td>
        <td className="py-4 pr-4">
          <Badge label={audienceLabelFor(notice)} variant="violet" />
        </td>
        <td className="py-4 pr-4">
          <Badge label={notice.priority} variant={PRIORITY_VARIANTS[notice.priority]} />
        </td>
        <td className="py-4 pr-4 text-gray-600">{notice.postedByName}</td>
        <td className="py-4 pr-4 text-gray-500">{formatDate(notice.createdAt)}</td>
        <td className="py-4 pr-6">
          <div className="flex items-center justify-end gap-2">
            {canManage && (
              <NoticeRowActions notice={notice} sessionOptions={sessionOptions} defaultSession={defaultSession} currentUser={currentUser} />
            )}
          </div>
        </td>
      </tr>

      <NoticeDetailModal notice={notice} isOpen={showDetail} onClose={() => setShowDetail(false)} />
    </>
  );
}

function NoticeMobileCard({ notice, serialNumber, canManage, sessionOptions, defaultSession, currentUser }) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <div className="border border-gray-100 rounded-xl p-4">
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
        className="flex items-start justify-between gap-3 cursor-pointer"
      >
        <div className="flex items-start gap-2 min-w-0">
          <span className="text-xs font-medium text-gray-400 mt-0.5 w-5 shrink-0">{serialNumber}</span>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">{notice.title}</p>
            <p className="text-xs text-gray-400 truncate">{notice.message}</p>
            <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
              <Badge label={audienceLabelFor(notice)} variant="violet" />
              <Badge label={notice.priority} variant={PRIORITY_VARIANTS[notice.priority]} />
            </div>
          </div>
        </div>
        {canManage && (
          <NoticeRowActions notice={notice} sessionOptions={sessionOptions} defaultSession={defaultSession} currentUser={currentUser} />
        )}
      </div>

      <NoticeDetailModal notice={notice} isOpen={showDetail} onClose={() => setShowDetail(false)} />
    </div>
  );
}

export default function NoticesTable({ notices, serialStart = 1, canManageFor, sessionOptions, defaultSession, currentUser }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {notices.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-16">No notices match your filters.</p>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="py-4 pl-6 pr-4">S.No.</th>
                  <th className="py-4 pr-4">Notice</th>
                  <th className="py-4 pr-4">Audience</th>
                  <th className="py-4 pr-4">Priority</th>
                  <th className="py-4 pr-4">Posted By</th>
                  <th className="py-4 pr-4">Date</th>
                  <th className="py-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {notices.map((notice, index) => (
                  <NoticeTableRow
                    key={notice.id}
                    notice={notice}
                    serialNumber={serialStart + index}
                    canManage={canManageFor(notice)}
                    sessionOptions={sessionOptions}
                    defaultSession={defaultSession}
                    currentUser={currentUser}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden p-4 space-y-3">
            {notices.map((notice, index) => (
              <NoticeMobileCard
                key={notice.id}
                notice={notice}
                serialNumber={serialStart + index}
                canManage={canManageFor(notice)}
                sessionOptions={sessionOptions}
                defaultSession={defaultSession}
                currentUser={currentUser}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
