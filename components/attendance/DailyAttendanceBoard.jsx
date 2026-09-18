'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiCheckSquare, FiAlertCircle, FiUserCheck, FiLock } from 'react-icons/fi';
import Toast from '@/components/Toast';
import AttendanceFiltersBar from './AttendanceFiltersBar';
import AttendanceSummaryCards from './AttendanceSummaryCards';
import AttendanceRosterGrid from './AttendanceRosterGrid';
import AttendanceSummaryPanel from './AttendanceSummaryPanel';
import AttendanceActionBar from './AttendanceActionBar';
import AttendanceAlreadyMarkedCard from './AttendanceAlreadyMarkedCard';
import AttendanceEmptyState from './AttendanceEmptyState';
import SelectClassSectionState from './SelectClassSectionState';
import AttendanceListSkeleton from './AttendanceListSkeleton';
import RemarkModal from './RemarkModal';
import { getAttendanceRoster, saveAttendance } from '@/lib/api';
import { useClassSections, getSectionOptions } from '@/lib/hooks/useClassSections';

export default function DailyAttendanceBoard({ initialSession, initialDate, classOptions, currentUser }) {
  // No longer user-changeable from this page's filter bar — the school-wide
  // active academic session (switched via the Topbar dropdown, see
  // Topbar.jsx) is now the single source of truth for "which session" every
  // page reads, not a per-page override.
  const session = initialSession;
  const [date, setDate] = useState(initialDate);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [search, setSearch] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [roster, setRoster] = useState([]);
  const [existingRecord, setExistingRecord] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [access, setAccess] = useState({ allowed: true, reason: '' });
  const [teacherAccess, setTeacherAccess] = useState({ allowed: true, reason: '' });

  const [statuses, setStatuses] = useState({});
  const [remarks, setRemarks] = useState({});
  const [baseline, setBaseline] = useState({ statuses: {}, remarks: {} });

  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [remarkTarget, setRemarkTarget] = useState(null);
  const [markAllFeedback, setMarkAllFeedback] = useState('');
  const feedbackTimer = useRef(null);

  const classSections = useClassSections();

  const sectionOptions = useMemo(() => {
    if (!selectedClass) return [];
    if (currentUser.role === 'Teacher') {
      return (currentUser.assignedClasses || [])
        .filter((a) => a.class === selectedClass)
        .map((a) => ({ value: a.section, label: `Section ${a.section}` }));
    }
    return getSectionOptions(classSections, selectedClass);
  }, [selectedClass, currentUser, classSections]);

  // `classSections` starts as `{}` while useClassSections()'s fetch is still
  // in flight — indistinguishable, by shape alone, from "this school truly
  // has zero classes with sections". Trusting that during the race (a class
  // picked the instant the page mounts, before the fetch resolves) meant
  // `sectionOptions.length === 0` looked like "section-less class" even for
  // one that actually has real sections, letting canLoadRoster fetch a
  // roster with no section filter — which matches zero students and shows
  // an empty class. `classOptions` (server-rendered) already proves the
  // school has classes, so an empty `classSections` here can only mean "not
  // loaded yet", never "no classes exist" — a safe, hook-API-free signal.
  const classSectionsLoaded = Object.keys(classSections).length > 0;
  const canLoadRoster = Boolean(
    session && date && selectedClass && (selectedSection || (classSectionsLoaded && sectionOptions.length === 0))
  );

  const loadRoster = useCallback(() => {
    if (!canLoadRoster) {
      setRoster([]);
      setExistingRecord(null);
      return () => {};
    }

    let cancelled = false;
    setIsLoading(true);
    setLoadError('');

    getAttendanceRoster({ session, date, className: selectedClass, sectionName: selectedSection })
      .then(({ students, existingRecord: record, access: viewerAccess, teacherAccess: teacherAccessInfo }) => {
        if (cancelled) return;
        setRoster(students);
        setExistingRecord(record);
        setAccess(viewerAccess);
        setTeacherAccess(teacherAccessInfo);

        if (record) {
          const st = {};
          const rm = {};
          // A saved record only has entries for students who existed in the
          // roster at save time — anyone added to the section since defaults
          // to Present, same as a never-marked roster, rather than showing blank.
          students.forEach((s) => {
            st[s.id] = 'Present';
          });
          record.records.forEach((r) => {
            st[r.studentId] = r.status;
            if (r.remark) rm[r.studentId] = r.remark;
          });
          setStatuses(st);
          setRemarks(rm);
          setBaseline({ statuses: st, remarks: rm });
          setIsEditing(false);
        } else {
          const st = {};
          students.forEach((s) => {
            st[s.id] = 'Present';
          });
          setStatuses(st);
          setRemarks({});
          setBaseline({ statuses: st, remarks: {} });
          // Only drop straight into the marking grid if this viewer is
          // actually allowed to mark — a Teacher outside the window instead
          // sees the "marking locked" state below.
          setIsEditing(viewerAccess.allowed);
        }
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, date, selectedClass, selectedSection]);

  useEffect(() => loadRoster(), [loadRoster]);
  useEffect(() => () => clearTimeout(feedbackTimer.current), []);

  const handleClassChange = (value) => {
    setSelectedClass(value);
    setSelectedSection('');
  };

  const handleMarkAllPresent = () => {
    setStatuses((prev) => {
      const next = { ...prev };
      roster.forEach((s) => {
        next[s.id] = 'Present';
      });
      return next;
    });
    setMarkAllFeedback('All students marked as present.');
    clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setMarkAllFeedback(''), 4000);
  };

  const handleStatusChange = (studentId, status) => {
    setStatuses((prev) => ({ ...prev, [studentId]: status }));
    setMarkAllFeedback('');
  };

  const handleSaveRemark = (remark) => {
    setRemarks((prev) => ({ ...prev, [remarkTarget.id]: remark }));
    setRemarkTarget(null);
  };

  // A roster that's never actually been saved (no `existingRecord`) must
  // always be savable, even if nothing was toggled from its all-Present
  // default — "Mark All Present" then Save is a completely normal first-time
  // flow, not a no-op, and Save was staying disabled for it before this
  // check because the fresh defaults happen to already equal the baseline.
  const isDirty =
    !existingRecord ||
    JSON.stringify(statuses) !== JSON.stringify(baseline.statuses) ||
    JSON.stringify(remarks) !== JSON.stringify(baseline.remarks);

  const handleReset = () => {
    setStatuses(baseline.statuses);
    setRemarks(baseline.remarks);
    setMarkAllFeedback('');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const records = roster.map((s) => ({ studentId: s.id, status: statuses[s.id] || 'Present', remark: remarks[s.id] || '' }));
      const saved = await saveAttendance({
        academicSession: session,
        date,
        className: selectedClass,
        sectionName: selectedSection,
        records,
        markedBy: currentUser.name,
      });
      setExistingRecord(saved);
      setBaseline({ statuses, remarks });
      setToastMessage('Attendance saved successfully.');
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const rollNumbers = useMemo(() => {
    const map = {};
    roster.forEach((s, index) => {
      map[s.id] = index + 1;
    });
    return map;
  }, [roster]);

  const filteredRoster = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return roster;
    return roster.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.admissionId.toLowerCase().includes(query) ||
        String(rollNumbers[s.id]) === query
    );
  }, [roster, search, rollNumbers]);

  const counts = useMemo(() => {
    const result = { Present: 0, Absent: 0, Leave: 0 };
    roster.forEach((s) => {
      const status = statuses[s.id];
      if (status) result[status] += 1;
    });
    return result;
  }, [roster, statuses]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-gray-900">Daily Attendance</h1>
          {currentUser.role === 'Teacher' && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-full px-3 py-1">
              <FiUserCheck className="w-3.5 h-3.5" />
              Showing your assigned classes
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-1">Mark and manage student attendance for your classes.</p>
      </div>

      <AttendanceFiltersBar
        date={date}
        onDateChange={setDate}
        classOptions={classOptions}
        selectedClass={selectedClass}
        onClassChange={handleClassChange}
        sectionOptions={sectionOptions}
        selectedSection={selectedSection}
        onSectionChange={setSelectedSection}
        search={search}
        onSearchChange={setSearch}
        searchDisabled={!canLoadRoster || !isEditing}
      />

      {!canLoadRoster && <SelectClassSectionState />}

      {canLoadRoster && isLoading && <AttendanceListSkeleton />}

      {canLoadRoster && !isLoading && loadError && (
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-10 text-center">
          <FiAlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600">{loadError}</p>
          <button type="button" onClick={loadRoster} className="mt-4 text-sm font-medium text-indigo-600 hover:underline cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {canLoadRoster && !isLoading && !loadError && roster.length === 0 && (
        <AttendanceEmptyState
          title="No students in this section"
          description="Add students to this section before marking attendance."
        />
      )}

      {canLoadRoster && !isLoading && !loadError && roster.length > 0 && !existingRecord && !isEditing && (
        <AttendanceEmptyState
          icon={FiLock}
          title="Attendance Marking Locked"
          description={access.reason}
        />
      )}

      {canLoadRoster && !isLoading && !loadError && roster.length > 0 && existingRecord && !isEditing && (
        <AttendanceAlreadyMarkedCard
          record={existingRecord}
          className={selectedClass}
          sectionName={selectedSection}
          onEdit={() => setIsEditing(true)}
          access={access}
          teacherAccess={teacherAccess}
          isAdmin={currentUser.role !== 'Teacher'}
          onLockChange={loadRoster}
        />
      )}

      {canLoadRoster && !isLoading && !loadError && roster.length > 0 && isEditing && (
        <>
          <AttendanceSummaryCards
            total={roster.length}
            present={counts.Present}
            absent={counts.Absent}
            leave={counts.Leave}
          />

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-5 border-b border-gray-100">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Student Attendance</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {filteredRoster.length} of {roster.length} students
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={handleMarkAllPresent}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer"
                  >
                    <FiCheckSquare className="w-4 h-4" />
                    Mark All Present
                  </button>
                  {markAllFeedback && <p className="text-xs text-green-600">{markAllFeedback}</p>}
                </div>
              </div>

              <div className="p-4 sm:p-6">
                {filteredRoster.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-10">No students match your search.</p>
                ) : (
                  <AttendanceRosterGrid
                    students={filteredRoster}
                    rollNumbers={rollNumbers}
                    statuses={statuses}
                    remarks={remarks}
                    onStatusChange={handleStatusChange}
                    onOpenRemark={setRemarkTarget}
                  />
                )}
              </div>

              <p className="flex items-center gap-2 text-xs text-gray-400 px-6 pb-5">
                Click on any student to change status. Changes are saved once you press Save Attendance.
              </p>
            </div>

            <AttendanceSummaryPanel students={roster} statuses={statuses} rollNumbers={rollNumbers} />
          </div>

          <AttendanceActionBar counts={counts} onSave={handleSave} onReset={handleReset} isSaving={isSaving} isDirty={isDirty} />
        </>
      )}

      <RemarkModal
        isOpen={Boolean(remarkTarget)}
        onClose={() => setRemarkTarget(null)}
        student={remarkTarget}
        initialRemark={remarkTarget ? remarks[remarkTarget.id] : ''}
        onSave={handleSaveRemark}
      />

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}
