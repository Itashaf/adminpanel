'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FiPlus,
  FiClipboard,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiArrowRight,
  FiFileText,
  FiMoreVertical,
  FiEdit2,
  FiTrash2,
  FiBarChart2,
} from 'react-icons/fi';
import Badge from '@/components/Badge';
import DropdownMenu from '@/components/DropdownMenu';
import ConfirmDialog from '@/components/ConfirmDialog';
import Toast from '@/components/Toast';
import ExamFormModal from './ExamFormModal';
import { deleteExam } from '@/lib/api';

const STATUS_VARIANTS = { Draft: 'gray', Published: 'green', Completed: 'blue' };

const STAT_CARDS = [
  { key: 'totalExams', label: 'Total Exams', icon: FiFileText, color: 'text-blue-600 bg-blue-50', linkLabel: 'View all exams' },
  { key: 'upcomingExams', label: 'Upcoming Exams', icon: FiCalendar, color: 'text-emerald-600 bg-emerald-50', linkLabel: 'View schedule' },
  { key: 'completedExams', label: 'Completed Exams', icon: FiCheckCircle, color: 'text-violet-600 bg-violet-50', linkLabel: 'View results' },
  { key: 'resultsPending', label: 'Results Pending', icon: FiClock, color: 'text-amber-600 bg-amber-50', linkLabel: 'Generate results' },
];

const SUBJECT_BUCKETS = [
  { key: 'completed', label: 'Completed', dot: 'bg-emerald-500' },
  { key: 'inProgress', label: 'In Progress', dot: 'bg-blue-500' },
  { key: 'pending', label: 'Pending', dot: 'bg-amber-500' },
  { key: 'notStarted', label: 'Not Started', dot: 'bg-red-500' },
];

const STATUS_BREAKDOWN = [
  { key: 'draft', label: 'Draft', dot: 'bg-blue-500', ring: '#3b82f6' },
  { key: 'published', label: 'Published', dot: 'bg-violet-600', ring: '#7c3aed' },
  { key: 'marksCollection', label: 'Marks Collection', dot: 'bg-teal-500', ring: '#14b8a6' },
  { key: 'verification', label: 'Verification', dot: 'bg-amber-500', ring: '#f59e0b' },
  { key: 'resultPublished', label: 'Result Published', dot: 'bg-red-500', ring: '#ef4444' },
];

const ACTIVITY_ICON = {
  MarksEntered: { icon: FiFileText, color: 'text-violet-600 bg-violet-50' },
  ExamCreated: { icon: FiFileText, color: 'text-violet-600 bg-violet-50' },
  ScheduleUpdated: { icon: FiCalendar, color: 'text-orange-600 bg-orange-50' },
  ExamStatusChanged: { icon: FiCalendar, color: 'text-emerald-600 bg-emerald-50' },
  ResultPublished: { icon: FiBarChart2, color: 'text-purple-600 bg-purple-50' },
  ResultUnpublished: { icon: FiClock, color: 'text-gray-500 bg-gray-50' },
  MarksRejected: { icon: FiClock, color: 'text-red-600 bg-red-50' },
};

function timeAgo(iso) {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function formatDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatClasses(classes) {
  if (!classes || classes.length === 0) return '—';
  if (classes.length <= 3) return classes.join(', ');
  return `${classes.length} classes`;
}

function StatusDonut({ breakdown, total }) {
  let cumulative = 0;
  const stops = STATUS_BREAKDOWN.filter((b) => breakdown[b.key] > 0).map((b) => {
    const start = (cumulative / total) * 360;
    cumulative += breakdown[b.key];
    const end = (cumulative / total) * 360;
    return `${b.ring} ${start}deg ${end}deg`;
  });
  const gradient = total > 0 && stops.length > 0 ? `conic-gradient(${stops.join(', ')})` : '#e5e7eb';

  return (
    <div className="relative w-40 h-40 shrink-0 rounded-full" style={{ background: gradient }}>
      <div className="absolute inset-3 bg-white rounded-full flex flex-col items-center justify-center">
        <p className="text-3xl font-bold text-gray-900">{total}</p>
        <p className="text-xs text-gray-400 mt-0.5">Total Exams</p>
      </div>
    </div>
  );
}

function ExamRow({ exam, onChanged }) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteExam(exam.id);
      setShowConfirm(false);
      onChanged('Exam deleted.');
    } finally {
      setIsDeleting(false);
    }
  };

  const menuItems = [
    { label: 'View Schedule', icon: <FiCalendar className="w-4 h-4" />, onClick: () => router.push(`/dashboard/exams/${exam.id}#exam-schedule`) },
    { label: 'Edit Exam', icon: <FiEdit2 className="w-4 h-4" />, onClick: () => router.push(`/dashboard/exams/${exam.id}`) },
    { label: 'Delete Exam', icon: <FiTrash2 className="w-4 h-4" />, onClick: () => setShowConfirm(true), danger: true },
  ];

  return (
    <>
      <tr className="hover:bg-gray-50/60 transition">
        <td className="py-3 pl-5 pr-4 text-sm font-semibold text-gray-900 whitespace-nowrap">{exam.name}</td>
        <td className="py-3 pr-4 text-sm text-gray-600 whitespace-nowrap">{exam.examType}</td>
        <td className="py-3 pr-4 text-sm text-gray-600 whitespace-nowrap">{formatClasses(exam.classes)}</td>
        <td className="py-3 pr-4 text-sm text-gray-600 whitespace-nowrap">{formatDate(exam.startDate)}</td>
        <td className="py-3 pr-4">
          <Badge label={exam.status} variant={STATUS_VARIANTS[exam.status]} />
        </td>
        <td className="py-3 pr-5">
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/exams/${exam.id}`}
              className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition"
            >
              View
            </Link>
            <DropdownMenu trigger={<FiMoreVertical className="w-4 h-4" />} items={menuItems} />
          </div>
        </td>
      </tr>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        title="Delete exam?"
        description={`"${exam.name}" and its entire schedule, marks, and results will be permanently removed.`}
        confirmLabel="Delete"
        isLoading={isDeleting}
      />
    </>
  );
}

export default function ExamDashboardClient({ stats, sessionOptions, defaultSession, examTypeOptions }) {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const subjects = stats.subjectsProgress;
  const subjectsCompletedPercent = subjects.total > 0 ? Math.round((subjects.completed / subjects.total) * 100) : 0;

  const handleChanged = (message) => {
    setToastMessage(message);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exam Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Track exams, schedules, marks entry and results across the school.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer shrink-0"
        >
          <FiPlus className="w-4 h-4" />
          Create Exam
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.key} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <span className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${card.color}`}>
                  <Icon className="w-5 h-5" />
                </span>
                <p className="text-sm text-gray-500">{card.label}</p>
              </div>
              <p className="text-3xl font-bold text-gray-900 mt-3">{stats[card.key]}</p>
              <Link
                href="/dashboard/exams/list"
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 mt-2"
              >
                {card.linkLabel}
                <FiArrowRight className="w-3 h-3" />
              </Link>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Marks Entry Progress</h2>
            <Link href="/dashboard/exams/list" className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
              View by Class
              <FiArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="flex items-center justify-between mt-4 text-sm">
            <span className="text-gray-500">
              {subjects.completed} / {subjects.total} subjects completed
            </span>
            <span className="font-semibold text-gray-900">{subjectsCompletedPercent}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
            <div className="h-full bg-violet-700 rounded-full transition-all" style={{ width: `${subjectsCompletedPercent}%` }} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            {SUBJECT_BUCKETS.map((bucket) => (
              <div key={bucket.key} className="bg-gray-50 rounded-xl p-3">
                <p className="text-2xl font-bold text-gray-900">{subjects[bucket.key]}</p>
                <p className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                  <span className={`w-2 h-2 rounded-full ${bucket.dot}`} />
                  {bucket.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900">Exam Status Overview</h2>
          <div className="flex items-center gap-6 mt-4">
            <StatusDonut breakdown={stats.examStatusBreakdown} total={stats.totalExams} />
            <div className="flex-1 space-y-3 min-w-0">
              {STATUS_BREAKDOWN.map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm text-gray-600 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.dot}`} />
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span className="text-sm font-semibold text-gray-900 shrink-0">{stats.examStatusBreakdown[item.key]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Upcoming Exams</h2>
            <Link href="/dashboard/exams/list" className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
              View all
              <FiArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {stats.upcomingExamsList.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-10">No upcoming exams scheduled.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
                    <th className="py-2.5 pl-5 pr-4">Exam Name</th>
                    <th className="py-2.5 pr-4">Type</th>
                    <th className="py-2.5 pr-4">Classes</th>
                    <th className="py-2.5 pr-4">Start Date</th>
                    <th className="py-2.5 pr-4">Status</th>
                    <th className="py-2.5 pr-5">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {stats.upcomingExamsList.map((exam) => (
                    <ExamRow key={exam.id} exam={exam} onChanged={handleChanged} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Recent Activity</h2>
            <Link href="/dashboard/exams/list" className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
              View all
              <FiArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {stats.recentActivity.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-10">No activity yet.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {stats.recentActivity.map((item) => {
                const meta = ACTIVITY_ICON[item.type] || ACTIVITY_ICON.MarksEntered;
                const Icon = meta.icon;
                return (
                  <div key={item.id} className="flex items-center gap-3 px-5 py-3">
                    <span className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${meta.color}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.title}</p>
                      <p className="text-xs text-gray-400 truncate">{item.subtitle}</p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{timeAgo(item.timestamp)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ExamFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        exam={null}
        sessionOptions={sessionOptions}
        defaultSession={defaultSession}
        examTypeOptions={examTypeOptions}
        onSuccess={(message) => {
          setShowAddModal(false);
          handleChanged(message);
        }}
      />

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}
