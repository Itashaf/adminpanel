'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiPlus, FiEdit3 } from 'react-icons/fi';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import Dropdown from '@/components/Dropdown';
import { getSubjectTests, createSubjectTest } from '@/lib/api';
import { useClassSections, getSectionOptions } from '@/lib/hooks/useClassSections';
import PerformanceTabs from './PerformanceTabs';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function SubjectTestsExplorer({ classOptions, sessionOptions, defaultAcademicSession, subjects, teacherOptions, canManage, isTeacher }) {
  const router = useRouter();
  const [academicSession, setAcademicSession] = useState(defaultAcademicSession);
  const [className, setClassName] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [tests, setTests] = useState(null);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const classSections = useClassSections();

  const refresh = () => {
    if (!academicSession) return;
    getSubjectTests({ academicSession, class: className, section: sectionName })
      .then(setTests)
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    setError('');
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academicSession, className, sectionName]);

  const handleCreated = () => {
    setShowCreate(false);
    refresh();
  };

  return (
    <div className="space-y-6">
      <PerformanceTabs />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subject Tests</h1>
          <p className="text-sm text-gray-500 mt-1">{className ? `${className}${sectionName ? ` - ${sectionName}` : ''}` : 'All classes'}</p>
        </div>
        {canManage && <Button label="Create Test" icon={<FiPlus className="w-4 h-4" />} onClick={() => setShowCreate(true)} />}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-end">
        <div className="w-40">
          <label className="block text-xs font-medium text-gray-400 mb-1">Session</label>
          <Dropdown placeholder="Session" value={academicSession} onChange={setAcademicSession} options={sessionOptions} />
        </div>
        <div className="w-40">
          <label className="block text-xs font-medium text-gray-400 mb-1">Class</label>
          <Dropdown
            placeholder="All Classes"
            value={className}
            onChange={(v) => {
              setClassName(v);
              setSectionName('');
            }}
            options={[{ value: '', label: 'All Classes' }, ...classOptions]}
          />
        </div>
        <div className="w-40">
          <label className="block text-xs font-medium text-gray-400 mb-1">Section</label>
          <Dropdown
            placeholder="All Sections"
            value={sectionName}
            onChange={setSectionName}
            options={[{ value: '', label: 'All Sections' }, ...getSectionOptions(classSections, className)]}
            disabled={!className}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{error}</p>}

      {!academicSession ? (
        <p className="text-sm text-gray-400 text-center py-8">
          No academic session found for the school currently in context. If you&apos;re Super Admin, open{' '}
          <span className="font-medium text-gray-600">Manage This School</span> for the school you want to view first.
        </p>
      ) : !tests ? (
        <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {tests.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No tests match this filter.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide border-b border-gray-100">
                    <th className="py-2 pr-4">Test Name</th>
                    <th className="py-2 pr-4">Subject</th>
                    <th className="py-2 pr-4">Class</th>
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Max Marks</th>
                    <th className="py-2 pr-4">Marks Entered</th>
                    <th className="py-2 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tests.map((t) => (
                    <tr key={t.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                      <td className="py-3 pr-4 font-medium text-gray-900">{t.testName}</td>
                      <td className="py-3 pr-4 text-gray-700">{t.subjectName}</td>
                      <td className="py-3 pr-4 text-gray-700">{t.className} - {t.sectionName}</td>
                      <td className="py-3 pr-4 text-gray-500">{formatDate(t.testDate)}</td>
                      <td className="py-3 pr-4 text-gray-700">{t.maxMarks}</td>
                      <td className="py-3 pr-4 text-gray-700">{t.marksEnteredCount}</td>
                      <td className="py-3 pr-4 text-right">
                        <button
                          type="button"
                          onClick={() => router.push(`/dashboard/performance/tests/${t.id}/marks`)}
                          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
                        >
                          <FiEdit3 className="w-3.5 h-3.5" />
                          {canManage ? 'Enter Marks' : 'View Marks'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <CreateTestModal
          academicSession={academicSession}
          sessionOptions={sessionOptions}
          classOptions={classOptions}
          classSections={classSections}
          subjects={subjects}
          teacherOptions={teacherOptions}
          isTeacher={isTeacher}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}

function CreateTestModal({ academicSession, sessionOptions, classOptions, classSections, subjects, teacherOptions, isTeacher, onClose, onCreated }) {
  const [session, setSession] = useState(academicSession);
  const [className, setClassName] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [testName, setTestName] = useState('');
  const [testDate, setTestDate] = useState('');
  const [maxMarks, setMaxMarks] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!className || !sectionName || !subjectId || !testName || !testDate || !maxMarks || (!isTeacher && !teacherId)) {
      setError('All fields are required.');
      return;
    }
    setIsSaving(true);
    try {
      await createSubjectTest({
        academicSession: session,
        className,
        sectionName,
        subjectId,
        testName,
        testDate,
        maxMarks: Number(maxMarks),
        ...(isTeacher ? {} : { teacherId }),
      });
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      title="Create Test"
      isOpen
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button label="Cancel" variant="secondary" onClick={onClose} />
          <Button label={isSaving ? 'Creating...' : 'Create'} onClick={handleSubmit} disabled={isSaving} />
        </div>
      }
    >
      {error && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-3">{error}</p>}
      <div className="space-y-3">
        <Dropdown placeholder="Session" value={session} onChange={setSession} options={sessionOptions} />
        <div className="grid grid-cols-2 gap-3">
          <Dropdown
            placeholder="Class"
            value={className}
            onChange={(v) => {
              setClassName(v);
              setSectionName('');
            }}
            options={classOptions}
          />
          <Dropdown placeholder="Section" value={sectionName} onChange={setSectionName} options={getSectionOptions(classSections, className)} disabled={!className} />
        </div>
        <Dropdown placeholder="Subject" value={subjectId} onChange={setSubjectId} options={subjects} />
        {!isTeacher && <Dropdown placeholder="Teacher" value={teacherId} onChange={setTeacherId} options={teacherOptions} searchable />}
        <input
          type="text"
          placeholder="Test name (e.g. Unit Test 1)"
          value={testName}
          onChange={(e) => setTestName(e.target.value)}
          className="w-full text-sm border border-gray-200 rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            type="date"
            value={testDate}
            onChange={(e) => setTestDate(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="number"
            placeholder="Max marks"
            value={maxMarks}
            onChange={(e) => setMaxMarks(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>
    </Modal>
  );
}
