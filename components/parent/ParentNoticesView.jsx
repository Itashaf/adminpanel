'use client';

import { useState } from 'react';
import { FiBell, FiChevronDown, FiChevronUp, FiPaperclip } from 'react-icons/fi';
import Badge from '@/components/Badge';

const PRIORITY_DOT = { Normal: 'bg-gray-300', Important: 'bg-amber-500', Urgent: 'bg-red-500' };
const PRIORITY_VARIANTS = { Normal: 'gray', Important: 'amber', Urgent: 'red' };

function formatDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function audienceLabelFor(notice) {
  return notice.audience === 'Whole School'
    ? 'Whole School'
    : `${notice.className}${notice.sectionName ? ` • Sec ${notice.sectionName}` : ''}`;
}

function NoticeRow({ notice }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsExpanded((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded((prev) => !prev);
          }
        }}
        className="w-full flex items-start gap-3 px-4 sm:px-5 py-4 text-left cursor-pointer hover:bg-gray-50/60 transition"
      >
        <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[notice.priority]}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900 truncate">{notice.title}</p>
            <Badge label={audienceLabelFor(notice)} variant="violet" />
            <Badge label={notice.priority} variant={PRIORITY_VARIANTS[notice.priority]} />
          </div>
          {!isExpanded && <p className="text-xs text-gray-500 truncate mt-0.5">{notice.message}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0 pl-2">
          <span className="hidden sm:block text-xs text-gray-400 whitespace-nowrap">{formatDate(notice.createdAt)}</span>
          {isExpanded ? <FiChevronUp className="w-4 h-4 text-gray-300" /> : <FiChevronDown className="w-4 h-4 text-gray-300" />}
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 sm:px-5 pb-4 pl-9">
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{notice.message}</p>
          {notice.attachmentUrl && (
            <a
              href={notice.attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium mt-2"
            >
              <FiPaperclip className="w-3.5 h-3.5" />
              {notice.attachmentName || 'Attachment.pdf'}
            </a>
          )}
          <p className="text-xs text-gray-400 mt-3">Posted by {notice.postedByName}</p>
        </div>
      )}
    </div>
  );
}

export default function ParentNoticesView({ notices, student }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notices</h1>
        <p className="text-sm text-gray-500 mt-1">
          For {student.firstName} — {student.class}
          {student.section ? ` - ${student.section}` : ''} &amp; whole-school announcements
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {notices.length === 0 ? (
          <div className="text-center py-16 px-6">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 text-gray-300 mb-3">
              <FiBell className="w-6 h-6" />
            </span>
            <p className="text-sm text-gray-500">No notices yet.</p>
          </div>
        ) : (
          notices.map((notice) => <NoticeRow key={notice.id} notice={notice} />)
        )}
      </div>
    </div>
  );
}
