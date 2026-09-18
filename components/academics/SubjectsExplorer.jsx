'use client';

import { useMemo, useState } from 'react';
import { FiBook, FiPlus, FiEdit2, FiTrash2, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import Button from '@/components/Button';
import ConfirmDialog from '@/components/ConfirmDialog';
import Toast from '@/components/Toast';
import SubjectFormModal from './SubjectFormModal';
import { deleteSubject } from '@/lib/api';

const ROWS_PER_PAGE = 10;

export default function SubjectsExplorer({ initialSubjects }) {
  const [subjects, setSubjects] = useState(initialSubjects);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(subjects.length / ROWS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * ROWS_PER_PAGE;
  const pageRows = useMemo(
    () => subjects.slice(pageStart, pageStart + ROWS_PER_PAGE),
    [subjects, pageStart]
  );

  const openAddModal = () => {
    setEditingSubject(null);
    setShowFormModal(true);
  };

  const openEditModal = (subject) => {
    setEditingSubject(subject);
    setShowFormModal(true);
  };

  const handleFormSuccess = (message, updatedSubject) => {
    setShowFormModal(false);
    setToastMessage(message);
    setSubjects((prev) => {
      const next = editingSubject
        ? prev.map((s) => (s.id === editingSubject.id ? updatedSubject : s))
        : [...prev, updatedSubject];
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
  };

  const handleDelete = async () => {
    setDeleteError('');
    setIsDeleting(true);
    try {
      await deleteSubject(deleteTarget.id);
      setSubjects((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
      setToastMessage('Subject deleted successfully.');
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subjects</h1>
          <p className="text-sm text-gray-500 mt-1">Manage the master subject list used across classes, exams, and homework.</p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer shrink-0"
        >
          <FiPlus className="w-4 h-4" />
          Add Subject
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3 w-12">#</th>
                <th className="px-5 py-3">Subject Name</th>
                <th className="px-5 py-3">Code</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">
                    No subjects yet — add one above.
                  </td>
                </tr>
              )}
              {pageRows.map((subject, index) => (
                <tr key={subject.id} className="hover:bg-gray-50/60 transition">
                  <td className="px-5 py-3 text-gray-400">{pageStart + index + 1}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <FiBook className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-gray-900">{subject.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{subject.code || '—'}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                        subject.type === 'Practical' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                      }`}
                    >
                      {subject.type}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(subject)}
                        className="p-2 rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition cursor-pointer"
                        title="Edit"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteTarget(subject);
                          setDeleteError('');
                        }}
                        className="p-2 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition cursor-pointer"
                        title="Delete"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-3.5 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Showing {subjects.length === 0 ? 0 : pageStart + 1}–{Math.min(pageStart + ROWS_PER_PAGE, subjects.length)} of{' '}
            {subjects.length} subjects
          </p>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FiChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition cursor-pointer ${
                    p === currentPage ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FiChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <SubjectFormModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        subject={editingSubject}
        onSuccess={(message, updatedSubject) => handleFormSuccess(message, updatedSubject)}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Subject"
        description={deleteError || `Are you sure you want to delete "${deleteTarget?.name}"? This can't be undone.`}
        confirmLabel="Delete"
        isLoading={isDeleting}
      />

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}
