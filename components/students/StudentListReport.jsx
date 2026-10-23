'use client';

import { useEffect, useMemo, useState } from 'react';
import { FiLayers, FiGrid, FiPrinter } from 'react-icons/fi';
import Dropdown from '@/components/Dropdown';
import Toggle from '@/components/Toggle';
import { useClassSections, getSectionOptions } from '@/lib/hooks/useClassSections';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatAddress(address) {
  if (!address) return '—';
  const parts = [address.line1, address.line2, address.city, address.state, address.pinCode].filter(Boolean);
  return parts.length ? parts.join(', ') : '—';
}

// The All-Classes print's "Class" column — class names are stored as
// "Class 4" (see CLASS_LEVELS/classNameForLevel), but a dedicated column
// already says "Class" in its own header, so the row value itself drops the
// redundant word: "4 - A" instead of "Class 4 - A".
function formatClassSection(student) {
  const className = student.class?.replace(/^Class\s+/i, '') || student.class;
  return `${className}${student.section ? ` - ${student.section}` : ''}`;
}

// A student only ever has one `guardian` + optional `secondaryGuardian` (see
// lib/students.js's buildStudentFields) — either one could be recorded as
// Father or Mother, so both are checked rather than assuming guardian is
// always the father.
function findParentName(student, relationship) {
  if (student.guardian?.relationship === relationship) return student.guardian.fullName;
  if (student.secondaryGuardian?.relationship === relationship) return student.secondaryGuardian.fullName;
  return '';
}

// Class-wise printable roster for teachers — deliberately a plain table
// (not the StudentsTable used on the main directory) since a print-out
// needs every detail on one row per student, not progressive-disclosure
// affordances like row actions or avatars.
// "All Classes" lets an Admin/Principal print the whole school's roster in
// one go — a Teacher's own `classOptions` is already scoped server-side
// (see app/dashboard/students/list/page.jsx) to just their Class Teacher
// classes, so this is never a way to see beyond what they could already
// print one class at a time.
const ALL_CLASSES_OPTION = { value: '', label: 'All Classes' };

export default function StudentListReport({ students, classOptions }) {
  const classDropdownOptions = useMemo(() => [ALL_CLASSES_OPTION, ...classOptions], [classOptions]);
  const [selectedClass, setSelectedClass] = useState(classOptions[0]?.value || '');
  const [selectedSection, setSelectedSection] = useState('');
  // A second, much simpler print layout — just names with a blank ruled
  // column beside each one — for whenever a teacher needs to hand-write
  // something per student (attendance, marks, a signature) rather than
  // read the full detail sheet.
  const [blankMode, setBlankMode] = useState(false);

  // Blank Sheet prints portrait, full-detail prints landscape — swapped by
  // rewriting a single *unnamed* @page rule at runtime rather than defining
  // two named @page rules (one per mode) in CSS. Named pages aren't
  // reliably honored by real browsers' print dialogs — some fall back to
  // the printer's own paper orientation, clipping content sized for the
  // other one (see app/globals.css). Only ever one @page rule is active
  // this way, which every browser handles correctly.
  useEffect(() => {
    const styleTag = document.getElementById('student-list-page-size') || document.createElement('style');
    styleTag.id = 'student-list-page-size';
    styleTag.textContent = `@media print { @page { size: A4 ${blankMode ? 'portrait' : 'landscape'}; margin: 18mm 10mm; } }`;
    document.head.appendChild(styleTag);
    return () => styleTag.remove();
  }, [blankMode]);

  const classSections = useClassSections();
  const sectionOptions = getSectionOptions(classSections, selectedClass);

  const handleClassChange = (value) => {
    setSelectedClass(value);
    setSelectedSection('');
  };

  const filteredStudents = useMemo(() => {
    return students
      .filter((student) => !selectedClass || student.class === selectedClass)
      .filter((student) => !selectedSection || student.section === selectedSection)
      .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
  }, [students, selectedClass, selectedSection]);

  const scopeLabel = selectedClass
    ? `${selectedClass}${selectedSection ? ` - Section ${selectedSection}` : ''}`
    : 'All Classes';

  return (
    <div className="space-y-4">
      <div className="print:hidden bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-auto sm:min-w-[180px]">
          <Dropdown
            placeholder="Class"
            icon={<FiLayers className="w-4 h-4" />}
            value={selectedClass}
            onChange={handleClassChange}
            options={classDropdownOptions}
          />
        </div>
        <div className="w-full sm:w-auto sm:min-w-[180px]">
          <Dropdown
            placeholder="Section"
            icon={<FiGrid className="w-4 h-4" />}
            value={selectedSection}
            onChange={setSelectedSection}
            options={sectionOptions}
            disabled={!selectedClass}
          />
        </div>

        <div className="flex items-center gap-2 pl-1">
          <Toggle checked={blankMode} onChange={setBlankMode} />
          <span className="text-sm text-gray-600">Blank sheet (names only, for manual marking)</span>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          disabled={filteredStudents.length === 0}
          className="ml-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-full font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FiPrinter className="w-4 h-4" />
          {blankMode ? 'Print Blank List' : 'Print List'}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 print:border-0 print:shadow-none print:rounded-none print:p-2">
        <div className="flex items-center justify-between gap-4 mb-5 print:mb-1">
          <h2 className="text-[16px] print:text-[16px] font-bold text-gray-900">
            Student List — {scopeLabel}
            {blankMode ? ' (Blank Sheet)' : ''}
          </h2>
          {/* Blank box for a teacher to hand-write the date this list is used
              on — not a table column, since the date applies to the whole
              sheet (e.g. a day's attendance run), not one value per student. */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[12px] print:text-[12px] font-semibold text-gray-700">Date</span>
            <div className="w-40 h-8 print:w-32 print:h-6 border border-gray-300 rounded print:rounded-none" />
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <p className="text-[12px] text-gray-500 text-center py-10">
            {selectedClass ? 'No students found for this class.' : 'No students found.'}
          </p>
        ) : blankMode ? (
          <div className="overflow-x-auto rounded-xl border border-gray-100 print:border print:border-gray-400 print:rounded-none">
            <table className="w-full text-[12px] print:text-[12px] print:leading-[1.15] border-collapse">
              <thead>
                <tr className="bg-slate-50 text-left text-[10px] print:text-[11px] font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200 print:border-b-2 print:border-gray-400">
                  <th className="py-3 px-4 print:py-0.5 print:px-1.5 w-12 border-r border-gray-200 print:border-r print:border-gray-400">#</th>
                  {!selectedClass && (
                    <th className="py-3 px-4 print:py-0.5 print:px-1.5 w-20 text-center border-r border-gray-200 print:border-r print:border-gray-400">Class</th>
                  )}
                  <th className="py-3 px-4 print:py-0.5 print:px-1.5 w-48 text-center border-r border-gray-200 print:border-r print:border-gray-400">Student Name</th>
                  <th className="py-3 px-4 print:py-0.5 print:px-1.5 text-center">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, index) => (
                  <tr key={student.id} className="border-b border-gray-200 print:border-gray-400 last:border-0">
                    <td className="py-5 px-4 print:py-[2px] print:px-1.5 text-gray-500 align-bottom border-r border-gray-200 print:border-r print:border-gray-400">{index + 1}</td>
                    {!selectedClass && (
                      <td className="py-5 px-4 print:py-[2px] print:px-1.5 w-20 text-center text-gray-600 whitespace-nowrap align-bottom border-r border-gray-200 print:border-r print:border-gray-400">
                        {formatClassSection(student)}
                      </td>
                    )}
                    <td className="py-5 px-4 print:py-[2px] print:px-1.5 text-center text-gray-900 font-medium whitespace-nowrap align-bottom border-r border-gray-200 print:border-r print:border-gray-400">
                      {student.firstName} {student.lastName}
                    </td>
                    <td className="py-5 px-4 print:py-[2px] print:px-1.5" />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-100 print:border print:border-gray-400 print:rounded-none print:overflow-visible">
            {/* table-layout: auto (not fixed) — this table only ever prints
                landscape (blankMode governs portrait, and this is its else
                branch), so there's no narrow-page overflow risk to guard
                against. table-fixed forced every column to its full % width
                regardless of actual content (e.g. "DOB" at a 9%-wide column
                it never needed), leaving a visible empty gap between short
                content and its border-r before the next column starts —
                auto layout sizes each column to what its content actually
                needs instead. The print:w-[X%] hints still bias the
                remaining extra space toward Address, the one field that
                otherwise wraps to 2-3 lines and inflates every row's height. */}
            <table className="w-full text-[11px] print:text-[10px] print:leading-[1.15] border-collapse">
              <thead>
                <tr className="bg-slate-50 text-center text-[10px] print:text-[9px] font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200 print:border-b-2 print:border-gray-400">
                  <th className="p-2 print:py-0.5 print:px-1 print:w-[3%] border-r border-gray-200 print:border-r print:border-gray-400">#</th>
                  <th className="p-2 print:py-0.5 print:px-1 print:w-[12%] border-r border-gray-200 print:border-r print:border-gray-400">Name</th>
                  <th className="p-2 print:py-0.5 print:px-1 print:w-[12%] border-r border-gray-200 print:border-r print:border-gray-400">Admission ID</th>
                  {!selectedClass && (
                    <th className="p-2 print:py-0.5 print:px-1 print:w-[8%] border-r border-gray-200 print:border-r print:border-gray-400">Class</th>
                  )}
                  <th className="p-2 print:py-0.5 print:px-1 print:w-[9%] border-r border-gray-200 print:border-r print:border-gray-400">DOB</th>
                  <th className="p-2 print:py-0.5 print:px-1 print:w-[6%] border-r border-gray-200 print:border-r print:border-gray-400">Gender</th>
                  <th className="p-2 print:py-0.5 print:px-1 print:w-[12%] border-r border-gray-200 print:border-r print:border-gray-400">Father Name</th>
                  <th className="p-2 print:py-0.5 print:px-1 print:w-[12%] border-r border-gray-200 print:border-r print:border-gray-400">Mother Name</th>
                  <th className="p-2 print:py-0.5 print:px-1 print:w-[12%] border-r border-gray-200 print:border-r print:border-gray-400">Guardian Phone</th>
                  <th className={`p-2 print:py-0.5 print:px-1 ${selectedClass ? 'print:w-[22%]' : 'print:w-[14%]'}`}>Address</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, index) => (
                  <tr key={student.id} className="border-b border-gray-100 print:border-gray-300 align-top last:border-0">
                    <td className="p-2 print:py-[2px] print:px-1 border-r border-gray-100 print:border-r print:border-gray-300">{index + 1}</td>
                    <td className="p-2 print:py-[2px] print:px-1 text-gray-900 whitespace-nowrap print:whitespace-normal print:break-words border-r border-gray-100 print:border-r print:border-gray-300">
                      {student.firstName} {student.lastName}
                    </td>
                    <td className="p-2 print:py-[2px] print:px-1 font-medium text-gray-900 text-center whitespace-nowrap print:whitespace-normal print:break-words border-r border-gray-100 print:border-r print:border-gray-300">
                      {student.admissionId}
                    </td>
                    {!selectedClass && (
                      <td className="p-2 print:py-[2px] print:px-1 text-gray-600 whitespace-nowrap print:whitespace-normal print:break-words border-r border-gray-100 print:border-r print:border-gray-300">
                        {formatClassSection(student)}
                      </td>
                    )}
                    <td className="p-2 print:py-[2px] print:px-1 text-gray-600 text-center whitespace-nowrap print:whitespace-normal print:break-words border-r border-gray-100 print:border-r print:border-gray-300">
                      {formatDate(student.dob)}
                    </td>
                    <td className="p-2 print:py-[2px] print:px-1 text-gray-600 border-r border-gray-100 print:border-r print:border-gray-300">{student.gender || '—'}</td>
                    <td className="p-2 print:py-[2px] print:px-1 text-gray-600 print:break-words border-r border-gray-100 print:border-r print:border-gray-300">
                      {findParentName(student, 'Father') || '—'}
                    </td>
                    <td className="p-2 print:py-[2px] print:px-1 text-gray-600 print:break-words border-r border-gray-100 print:border-r print:border-gray-300">
                      {findParentName(student, 'Mother') || '—'}
                    </td>
                    <td className="p-2 print:py-[2px] print:px-1 text-gray-600 text-center whitespace-nowrap print:whitespace-normal print:break-words border-r border-gray-100 print:border-r print:border-gray-300">
                      {student.guardian?.phone || '—'}
                    </td>
                    <td className="p-2 print:py-[2px] print:px-1 text-gray-600 max-w-[220px] print:max-w-none print:break-words">
                      {formatAddress(student.address)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
