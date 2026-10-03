'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiPlus, FiSearch, FiFileText, FiCheckCircle, FiClock, FiBookOpen } from 'react-icons/fi';
import Button from '@/components/Button';
import KPICard from '@/components/dashboard/KPICard';
import Modal from '@/components/Modal';
import Dropdown from '@/components/Dropdown';
import DatePicker from '@/components/DatePicker';
import FixedPaginationBar from '@/components/FixedPaginationBar';
import { getSubjectTests, createSubjectTest } from '@/lib/api';
import { useClassSections, getSectionOptions, classHasSections } from '@/lib/hooks/useClassSections';
import PerformanceListSkeleton from './PerformanceListSkeleton';

const PAGE_SIZE = 10;

const STATUS_STYLE = {
  DRAFT: { label: 'Draft', dot: 'bg-gray-400', className: 'bg-gray-100 text-gray-500' },
  IN_PROGRESS: { label: 'Pending', dot: 'bg-amber-500', className: 'bg-amber-50 text-amber-700' },
  COMPLETED: { label: 'Completed', dot: 'bg-emerald-600', className: 'bg-emerald-50 text-emerald-700' },
};

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function SubjectTestsExplorer({ classOptions, sessionOptions, defaultAcademicSession, subjects, teacherOptions, canManage, isTeacher }) {
  const router = useRouter();
  const [academicSession, setAcademicSession] = useState(defaultAcademicSession);
  const [className, setClassName] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [tests, setTests] = useState(null);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const classSections = useClassSections();

  const refresh = () => {
    if (!academicSession) return;
    getSubjectTests({ academicSession, class: className, section: sectionName, subjectId })
      .then(setTests)
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    setError('');
    setPage(1);
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academicSession, className, sectionName, subjectId]);

  const handleCreated = () => {
    setShowCreate(false);
    refresh();
  };

  const filteredTests = useMemo(() => {
    if (!tests) return [];
    const q = search.trim().toLowerCase();
    if (!q) return tests;
    return tests.filter((t) => t.testName.toLowerCase().includes(q) || t.subjectName.toLowerCase().includes(q));
  }, [tests, search]);

  const totalPages = Math.max(1, Math.ceil(filteredTests.length / PAGE_SIZE));
  const pagedTests = filteredTests.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const completedCount = tests?.filter((t) => t.status === 'COMPLETED').length ?? 0;
  const pendingCount = (tests?.length ?? 0) - completedCount;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subject Tests</h1>
          <p className="text-sm text-gray-500 mt-1">Manage subject tests and enter students&apos; marks.</p>
        </div>
        {canManage && <Button label="Create Test" icon={<FiPlus className="w-4 h-4" />} onClick={() => setShowCreate(true)} />}
      </div>

      {academicSession && tests && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label="Total Tests" icon={<FiFileText className="w-4 h-4" />} value={tests.length} context="This session" />
          <KPICard
            label="Completed"
            icon={<FiCheckCircle className="w-4 h-4" />}
            value={completedCount}
            context={`${tests.length > 0 ? Math.round((completedCount / tests.length) * 100) : 0}% of total`}
          />
          <KPICard
            label="Pending"
            icon={<FiClock className="w-4 h-4" />}
            value={pendingCount}
            context={`${tests.length > 0 ? Math.round((pendingCount / tests.length) * 100) : 0}% of total`}
          />
          <KPICard label="Subjects" icon={<FiBookOpen className="w-4 h-4" />} value={subjects.length} context="Across all classes" />
        </div>
      )}

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
        <div className="w-40">
          <label className="block text-xs font-medium text-gray-400 mb-1">Subject</label>
          <Dropdown placeholder="All Subjects" value={subjectId} onChange={setSubjectId} options={[{ value: '', label: 'All Subjects' }, ...subjects]} />
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search test name, subject..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 pr-3 py-2.5 w-full text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
        <PerformanceListSkeleton statCount={0} />
      ) : (
        <>
          <div>
            <h3 className="text-base font-bold text-gray-900">Tests ({filteredTests.length})</h3>
          </div>

          {/* Same wrapper/spacing/colors/fonts as StudentsTable.jsx — this
              table is deliberately styled to match the All Students table. */}
          <div className="relative bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {pagedTests.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-10">No tests match this filter.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      <th className="py-4 pl-6 pr-4 w-10">#</th>
                      <th className="py-4 pr-4">Test Name</th>
                      <th className="py-4 pr-4">Subject</th>
                      <th className="py-4 pr-4">Class</th>
                      <th className="py-4 pr-4 text-center">Max Marks</th>
                      <th className="py-4 pr-4 text-center">Marks Entered</th>
                      <th className="py-4 pr-4 text-center">Status</th>
                      <th className="py-4 pr-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pagedTests.map((t, index) => {
                      const status = STATUS_STYLE[t.status] || { label: t.status, dot: 'bg-gray-400', className: 'bg-gray-100 text-gray-500' };
                      return (
                        <tr key={t.id} className="hover:bg-gray-50/60 transition">
                          <td className="py-5 pl-6 pr-4 text-gray-400">{(page - 1) * PAGE_SIZE + index + 1}</td>
                          <td className="py-5 pr-4">
                            <p className="font-semibold text-gray-900">{t.testName}</p>
                            <p className="text-xs text-gray-400">{formatDate(t.testDate)}</p>
                          </td>
                          <td className="py-5 pr-4 text-gray-700">{t.subjectName}</td>
                          <td className="py-5 pr-4">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-700">{t.className}</span>
                              <span className="flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 text-xs font-semibold text-gray-600 shrink-0">
                                {t.sectionName}
                              </span>
                            </div>
                          </td>
                          <td className="py-5 pr-4 text-gray-700 text-center">{t.maxMarks}</td>
                          <td className="py-5 pr-4 text-gray-700 text-center">{t.marksEnteredCount} / {t.totalStudents}</td>
                          <td className="py-5 pr-4 text-center">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1 ${status.className}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                              {status.label}
                            </span>
                          </td>
                          <td className="py-5 pr-6">
                            <div className="flex justify-center">
                              <Button
                                label={canManage ? (t.status === 'COMPLETED' ? 'View Marks' : 'Enter Marks') : 'View Marks'}
                                variant="secondary"
                                onClick={() => router.push(`/dashboard/performance/tests/${t.id}/marks`)}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        </>
      )}

      <FixedPaginationBar page={page} totalPages={totalPages} onPageChange={setPage} totalCount={filteredTests.length} pageSize={PAGE_SIZE} itemLabel="tests" />

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

  const needsSection = className ? classHasSections(classSections, className) : true;

  const handleSubmit = async () => {
    setError('');
    if (!className || (needsSection && !sectionName) || !subjectId || !testName || !testDate || !maxMarks || (!isTeacher && !teacherId)) {
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
          <Dropdown
            placeholder={!className ? 'Section' : needsSection ? 'Section' : 'No sections for this class'}
            value={sectionName}
            onChange={setSectionName}
            options={getSectionOptions(classSections, className)}
            disabled={!className || !needsSection}
          />
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
        <div className="grid grid-cols-2 gap-3 mb-[10px]">
          <div>
            <label className="block text-xs text-gray-400 mb-1 pl-1">Exam Date</label>
            <DatePicker value={testDate} onChange={setTestDate} placeholder="Select exam date" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1 pl-1">Max Marks</label>
            <input
              type="number"
              placeholder="Max marks"
              value={maxMarks}
              onChange={(e) => setMaxMarks(e.target.value)}
              onWheel={(e) => e.currentTarget.blur()}
              className="w-full text-sm border border-gray-200 rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
