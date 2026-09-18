'use client';

import { useEffect, useMemo, useState } from 'react';
import { FiLayers, FiGrid, FiPrinter } from 'react-icons/fi';
import Dropdown from '@/components/Dropdown';
import { getPrintableRoster } from '@/lib/api';
import { useSubjects, useSubjectCodes } from '@/lib/hooks/useSubjects';

// Exam-independent print tool: pick a class+section, freely build up a list
// of subject columns (add one at a time — nothing to do with any Exam's
// schedule), then print a blank ruled grid for subject teachers to fill in
// by hand. No roll number column (deliberately dropped) and no marks are
// ever captured here — this only ever prints.
export default function PrintMarksheetClient({ classSections, isTeacher }) {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [roster, setRoster] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const subjectOptions = useSubjects();
  const subjectCodes = useSubjectCodes();

  const classOptions = useMemo(
    () => [...new Set(classSections.map((c) => c.className))].map((c) => ({ value: c, label: c })),
    [classSections]
  );

  const sectionOptions = useMemo(
    () =>
      classSections
        .filter((c) => c.className === selectedClass)
        .map((c) => ({ value: c.sectionName, label: `Section ${c.sectionName}` })),
    [classSections, selectedClass]
  );

  useEffect(() => {
    setRoster(null);
    if (!selectedClass || !selectedSection) return;
    setIsLoading(true);
    getPrintableRoster({ className: selectedClass, sectionName: selectedSection })
      .then(setRoster)
      .finally(() => setIsLoading(false));
  }, [selectedClass, selectedSection]);

  useEffect(() => {
    const styleTag = document.getElementById('print-marksheet-page-size') || document.createElement('style');
    styleTag.id = 'print-marksheet-page-size';
    styleTag.textContent = '@media print { @page { size: A4 landscape; margin: 14mm 8mm; } }';
    document.head.appendChild(styleTag);
    return () => styleTag.remove();
  }, []);

  const toggleSubject = (subject) => {
    setSubjects((prev) => (prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]));
  };

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <h1 className="text-2xl font-bold text-gray-900">Print Marksheet</h1>
        <p className="text-sm text-gray-500 mt-1">
          {isTeacher
            ? 'Build a blank marksheet for your own class — pick the subjects you want, then print.'
            : 'Pick a class and section, add whichever subjects you want, then print a blank sheet.'}
        </p>
      </div>

      <div className="print:hidden bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Class</label>
            <Dropdown
              placeholder="Select class"
              icon={<FiLayers className="w-4 h-4" />}
              options={classOptions}
              value={selectedClass}
              onChange={(v) => {
                setSelectedClass(v);
                setSelectedSection('');
              }}
              searchable
            />
            {classOptions.length === 0 && (
              <p className="text-xs text-gray-400 mt-1.5">
                {isTeacher ? "You aren't the Class Teacher of any section yet." : 'No classes found for this school.'}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Section</label>
            <Dropdown
              placeholder={selectedClass ? 'Select section' : 'Select a class first'}
              icon={<FiGrid className="w-4 h-4" />}
              options={sectionOptions}
              value={selectedSection}
              onChange={setSelectedSection}
              disabled={!selectedClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 sm:invisible">Print</label>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!roster || roster.students.length === 0 || subjects.length === 0}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-full font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiPrinter className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">Subjects to include (tap to select)</label>
          <div className="flex flex-wrap gap-1.5">
            {subjectOptions.map((subject) => {
              const isSelected = subjects.includes(subject);
              return (
                <button
                  key={subject}
                  type="button"
                  onClick={() => toggleSubject(subject)}
                  className={`text-xs font-medium rounded-full px-2.5 py-1 border transition cursor-pointer ${
                    isSelected ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {subject}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 print:border-0 print:shadow-none print:rounded-none print:p-2">
        {!selectedClass || !selectedSection ? (
          <p className="print:hidden text-sm text-gray-500 text-center py-12">Pick a class and section to load the roster.</p>
        ) : isLoading ? (
          <p className="print:hidden text-sm text-gray-500 text-center py-12">Loading...</p>
        ) : roster && roster.students.length === 0 ? (
          <p className="print:hidden text-sm text-gray-500 text-center py-12">No students found for this class and section.</p>
        ) : roster && subjects.length === 0 ? (
          <p className="print:hidden text-sm text-gray-500 text-center py-12">Add at least one subject above to build the sheet.</p>
        ) : roster ? (
          <>
            {/* Blank underline for the admin to hand-write the marksheet's
                title (e.g. "Half Yearly Examination Mark Sheet") — centered
                above everything else, same convention as the Date box below. */}
            <div className="text-center mb-4 print:mb-2">
              <div className="inline-block border-b-2 border-gray-500 w-full max-w-xl h-8 print:h-6" />
            </div>

            <div className="flex items-center justify-between gap-4 mb-4 print:mb-2">
              <h2 className="text-base font-bold text-gray-900">
                {roster.className} — Section {roster.sectionName}
              </h2>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-semibold text-gray-700">Date</span>
                <div className="w-32 h-7 border border-gray-400 rounded-none" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs print:text-[10px] border-collapse border border-gray-400">
                <thead>
                  <tr className="bg-slate-50 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
                    <th className="py-2.5 px-3 print:py-1 print:px-1 w-10 border border-gray-400">#</th>
                    <th className="py-2.5 px-3 print:py-1 print:px-1.5 border border-gray-400">Student Name</th>
                    {subjects.map((subject) => (
                      <th
                        key={subject}
                        className="py-2.5 px-1.5 print:py-1 print:px-0.5 text-center normal-case font-semibold text-[10px] print:text-[8px] leading-tight border border-gray-400"
                      >
                        {subjectCodes[subject] || subject}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {roster.students.map((student, index) => (
                    <tr key={student.studentId}>
                      <td className="py-2.5 px-3 print:py-1.5 print:px-1 text-gray-500 border border-gray-400">{index + 1}</td>
                      <td className="py-2.5 px-3 print:py-1.5 print:px-1.5 text-gray-900 font-medium whitespace-nowrap border border-gray-400">
                        {student.name}
                      </td>
                      {subjects.map((subject) => (
                        <td key={subject} className="py-2.5 px-1.5 print:py-1.5 print:px-0.5 border border-gray-400" />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
