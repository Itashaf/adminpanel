'use client';

import { useEffect, useMemo, useState } from 'react';
import { FiCalendar, FiLayers, FiBook, FiInfo, FiClipboard } from 'react-icons/fi';
import Dropdown from '@/components/Dropdown';
import EmptyState from '@/components/EmptyState';
import MarksEntrySheet from './MarksEntrySheet';
import { getExamSchedules } from '@/lib/api';

export default function MarksEntryClient({ exams, role }) {
  // Default every dropdown to its first option instead of an empty
  // placeholder — one exam/class/subject is picked automatically as soon as
  // its options load, so an admin/teacher with only one thing to grade never
  // has to click through three empty selects to get there.
  const [selectedExamId, setSelectedExamId] = useState(exams[0]?.id || '');
  const [schedules, setSchedules] = useState([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedScheduleId, setSelectedScheduleId] = useState('');

  useEffect(() => {
    setSchedules([]);
    setSelectedClass('');
    setSelectedScheduleId('');
    if (!selectedExamId) return;
    setIsLoadingSchedules(true);
    getExamSchedules(selectedExamId)
      .then(setSchedules)
      .finally(() => setIsLoadingSchedules(false));
  }, [selectedExamId]);

  const classOptions = useMemo(
    () => [...new Set(schedules.map((s) => s.className))].map((c) => ({ value: c, label: c })),
    [schedules]
  );

  useEffect(() => {
    if (classOptions.length > 0) setSelectedClass(classOptions[0].value);
  }, [classOptions]);

  const subjectSchedules = useMemo(
    () => (selectedClass ? schedules.filter((s) => s.className === selectedClass) : []),
    [schedules, selectedClass]
  );
  const subjectOptions = useMemo(() => subjectSchedules.map((s) => ({ value: s.id, label: s.subject })), [subjectSchedules]);

  useEffect(() => {
    setSelectedScheduleId(subjectOptions[0]?.value || '');
  }, [subjectOptions]);

  const selectedSchedule = schedules.find((s) => s.id === selectedScheduleId) || null;

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Marks Entry</h1>
        <p className="text-sm text-gray-500 mt-1">Select an exam, class and subject to enter marks.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 shrink-0">
        <div className={`grid grid-cols-1 gap-4 items-end ${selectedSchedule ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Exam</label>
            <Dropdown
              placeholder="Select exam"
              icon={<FiCalendar className="w-4 h-4" />}
              options={exams.map((e) => ({ value: e.id, label: `${e.name} (${e.academicSession})` }))}
              value={selectedExamId}
              onChange={setSelectedExamId}
              searchable
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
            <Dropdown
              placeholder={isLoadingSchedules ? 'Loading...' : 'Select class'}
              icon={<FiLayers className="w-4 h-4" />}
              options={classOptions}
              value={selectedClass}
              onChange={setSelectedClass}
              disabled={!selectedExamId || isLoadingSchedules || classOptions.length === 0}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
            <Dropdown
              placeholder="Select subject"
              icon={<FiBook className="w-4 h-4" />}
              options={subjectOptions}
              value={selectedScheduleId}
              onChange={setSelectedScheduleId}
              disabled={!selectedClass}
            />
          </div>

          {selectedSchedule && (
            <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5">
              <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-100 text-indigo-600 shrink-0">
                <FiInfo className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">
                  {selectedSchedule.markingType === 'Numeric' ? `Max Marks: ${selectedSchedule.maxMarks}` : `${selectedSchedule.markingType}-marked subject`}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {selectedSchedule.className}
                  {selectedSchedule.sectionName ? ` • Section ${selectedSchedule.sectionName}` : ''}
                </p>
              </div>
            </div>
          )}
        </div>

        {!isLoadingSchedules && selectedExamId && classOptions.length === 0 && (
          <p className="text-xs text-gray-400 mt-3">You have no subjects assigned to enter marks for in this exam.</p>
        )}
      </div>

      <div className={`flex-1 min-h-0 flex flex-col mt-6 ${selectedSchedule ? 'pb-28' : ''}`}>
        {selectedSchedule ? (
          <MarksEntrySheet schedule={selectedSchedule} role={role} />
        ) : exams.length === 0 ? (
          <EmptyState
            icon={FiClipboard}
            title="Nothing to enter yet"
            description="Once an exam is published with your subjects, it'll show up here."
          />
        ) : (
          <EmptyState icon={FiClipboard} description="Choose an exam, class, and subject above to start entering marks." />
        )}
      </div>
    </div>
  );
}
