'use client';

import { useEffect, useState } from 'react';
import {
  FiPlusCircle,
  FiRefreshCw,
  FiUploadCloud,
  FiXCircle,
  FiCheckCircle,
  FiUnlock,
  FiClock,
} from 'react-icons/fi';
import Modal from '@/components/Modal';
import { getExamAuditLog } from '@/lib/api';

const ACTION_META = {
  ExamCreated: { label: 'Exam created', icon: FiPlusCircle, color: 'text-indigo-600 bg-indigo-50' },
  ExamStatusChanged: { label: 'Status changed', icon: FiRefreshCw, color: 'text-blue-600 bg-blue-50' },
  MarksRejected: { label: 'Marks rejected', icon: FiXCircle, color: 'text-red-600 bg-red-50' },
  MarksApproved: { label: 'Marks approved', icon: FiCheckCircle, color: 'text-green-600 bg-green-50' },
  MarksUnlocked: { label: 'Marks unlocked', icon: FiUnlock, color: 'text-amber-600 bg-amber-50' },
  ResultGenerated: { label: 'Results generated', icon: FiRefreshCw, color: 'text-violet-600 bg-violet-50' },
  ResultPublished: { label: 'Results published', icon: FiUploadCloud, color: 'text-purple-600 bg-purple-50' },
  ResultUnpublished: { label: 'Results unpublished', icon: FiXCircle, color: 'text-gray-600 bg-gray-50' },
};

function describeMeta(action, meta) {
  if (!meta) return '';
  if (action === 'ExamStatusChanged') return `${meta.from} → ${meta.to}`;
  if (action === 'ExamCreated') return meta.name || '';
  if (action === 'ResultGenerated') return `${meta.generatedCount} generated${meta.skippedCount ? `, ${meta.skippedCount} skipped` : ''}`;
  if (action === 'MarksRejected') return meta.reason || '';
  return '';
}

function formatTimestamp(iso) {
  return new Date(iso).toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function ExamAuditLogModal({ isOpen, onClose, examId }) {
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    setError('');
    getExamAuditLog(examId)
      .then(setEntries)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [isOpen, examId]);

  return (
    <Modal title="Activity Log" description="A timeline of every action taken on this exam." isOpen={isOpen} onClose={onClose} size="lg">
      {error && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-4">{error}</p>}

      {isLoading ? (
        <p className="text-sm text-gray-500 text-center py-10">Loading activity...</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-10">No activity recorded yet.</p>
      ) : (
        <div className="max-h-96 overflow-y-auto -mx-1 px-1">
          <ul className="space-y-4">
            {entries.map((entry, idx) => {
              const meta = ACTION_META[entry.action] || { label: entry.action, icon: FiClock, color: 'text-gray-600 bg-gray-50' };
              const Icon = meta.icon;
              const detail = describeMeta(entry.action, entry.meta);
              return (
                <li key={entry.id} className="flex gap-3">
                  <div className="flex flex-col items-center shrink-0">
                    <span className={`flex items-center justify-center w-8 h-8 rounded-full ${meta.color}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    {idx < entries.length - 1 && <span className="w-px flex-1 bg-gray-100 mt-1" />}
                  </div>
                  <div className="pb-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{meta.label}</p>
                    {detail && <p className="text-xs text-gray-500 mt-0.5">{detail}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatTimestamp(entry.createdAt)}
                      {entry.actorName && ` • ${entry.actorName}`}
                      {entry.actorRole && ` (${entry.actorRole})`}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Modal>
  );
}
