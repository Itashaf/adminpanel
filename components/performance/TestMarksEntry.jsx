'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { FiArrowLeft, FiUploadCloud, FiSave } from 'react-icons/fi';
import Button from '@/components/Button';
import Toast from '@/components/Toast';
import { uploadSubjectTestMarks } from '@/lib/api';

// Manual grid (type marks per student, one Save) + bulk Excel upload
// (Admission No / Marks columns) — both call the same bulk-upload endpoint
// (uploadSubjectTestMarks accepts `rows`), so a manual save is just a
// 1-or-more-row version of the same import, not a separate code path.
export default function TestMarksEntry({ test, canManage }) {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [marksById, setMarksById] = useState(() => Object.fromEntries(test.marks.map((m) => [m.studentId, m.marksObtained ?? ''])));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [uploadResult, setUploadResult] = useState(null);

  const handleChange = (studentId, value) => {
    setMarksById((prev) => ({ ...prev, [studentId]: value }));
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    setError('');
    setUploadResult(null);
    const rows = test.marks
      .filter((m) => marksById[m.studentId] !== '' && marksById[m.studentId] != null)
      .map((m) => ({ admissionNo: m.admissionId, marks: Number(marksById[m.studentId]) }));
    if (rows.length === 0) {
      setIsSaving(false);
      setError('Enter at least one mark before saving.');
      return;
    }
    try {
      const result = await uploadSubjectTestMarks(test.id, { rows });
      setUploadResult(result);
      setToastMessage(`${result.successCount} of ${result.totalRecords} mark(s) saved.`);
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploadResult(null);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
      const result = await uploadSubjectTestMarks(test.id, { rows });
      setUploadResult(result);
      setToastMessage(`${result.successCount} of ${result.totalRecords} mark(s) imported.`);
      router.refresh();
    } catch (err) {
      setError(err.message || 'Could not read this file.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <button
        type="button"
        onClick={() => router.push('/dashboard/performance/tests')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-700 transition cursor-pointer"
      >
        <FiArrowLeft className="w-4 h-4" />
        Subject Tests
      </button>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{test.testName}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {test.subjectName} · {test.className} - {test.sectionName} · Max Marks {test.maxMarks}
            </p>
          </div>
          {canManage && (
            <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
              <FiUploadCloud className="w-4 h-4" />
              Bulk Upload Excel
              <input ref={fileInputRef} type="file" accept=".xlsx" onChange={handleFileUpload} className="hidden" />
            </label>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{error}</p>}

      {uploadResult && uploadResult.errors.length > 0 && (
        <div className="space-y-1.5">
          {uploadResult.errors.map((e, i) => (
            <p key={i} className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{e.message}</p>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide border-b border-gray-100">
                <th className="py-2 pr-4">Student Name</th>
                <th className="py-2 pr-4">Admission No.</th>
                <th className="py-2 pr-4">Marks</th>
                <th className="py-2 pr-4">%</th>
              </tr>
            </thead>
            <tbody>
              {test.marks.map((m) => {
                const value = marksById[m.studentId];
                const percent = value !== '' && value != null ? Math.round((Number(value) / test.maxMarks) * 1000) / 10 : null;
                return (
                  <tr key={m.studentId} className="border-b border-gray-50 last:border-0">
                    <td className="py-3 pr-4 font-medium text-gray-900">{m.studentName}</td>
                    <td className="py-3 pr-4 text-gray-500">{m.admissionId}</td>
                    <td className="py-3 pr-4">
                      <input
                        type="number"
                        min="0"
                        max={test.maxMarks}
                        value={value ?? ''}
                        onChange={(e) => handleChange(m.studentId, e.target.value)}
                        disabled={!canManage}
                        className="w-24 text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400"
                      />
                    </td>
                    <td className="py-3 pr-4 text-gray-500">{percent != null ? `${percent}%` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {canManage && (
          <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
            <Button label={isSaving ? 'Saving...' : 'Save Marks'} icon={<FiSave className="w-4 h-4" />} onClick={handleSaveAll} disabled={isSaving} />
          </div>
        )}
      </div>

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}
