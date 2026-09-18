'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  FiLayers,
  FiGrid,
  FiCopy,
  FiMoreVertical,
  FiTrash2,
  FiPlus,
  FiSave,
  FiEye,
  FiSettings,
  FiCoffee,
  FiX,
  FiSearch,
  FiClock,
} from 'react-icons/fi';
import Dropdown from '@/components/Dropdown';
import TimePicker from '@/components/TimePicker';
import Toast from '@/components/Toast';
import ConfirmDialog from '@/components/ConfirmDialog';
import TapPopover from './TapPopover';
import { getTimeTable, saveTimeTable, listTimeTables, deleteTimeTable } from '@/lib/api';
import { useClassSections, getSectionOptions, classHasSections } from '@/lib/hooks/useClassSections';
import { useSubjects, useSubjectRows } from '@/lib/hooks/useSubjects';
import { subjectColor, subjectInitials } from '@/lib/timetableColors';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DEFAULT_DURATION = 40;
const DURATION_OPTIONS = [15, 20, 25, 30, 35, 40, 45, 50, 60];

// Today's day tab, so the grid opens already showing today's schedule
// instead of always Monday — Sunday isn't one of the six tabs, so that one
// day falls back to Monday.
function todaysDay() {
  const name = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  return DAYS.includes(name) ? name : 'Monday';
}

function clockToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
function minutesToClock(totalMinutes) {
  const h24 = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

// Periods are one shared, ordered list — every day has the exact same
// period 1..N slots at the exact same times. Walking them once here (from
// `dayStartTime`) gives every period its start/end, whether it's a break or
// a subject slot.
function withPeriodTimes(dayStartTime, periods) {
  let cursor = clockToMinutes(dayStartTime);
  let periodNumber = 0;
  return periods.map((period) => {
    const start = cursor;
    cursor += period.duration || DEFAULT_DURATION;
    if (!period.isBreak) periodNumber += 1;
    return { ...period, startLabel: minutesToClock(start), endLabel: minutesToClock(cursor), periodNumber };
  });
}

export default function TimeTableClient({ classSections: initialClassSections, academicSession: initialSession }) {
  const classSections = useClassSections();
  const effectiveClassSections = Object.keys(classSections).length > 0 ? classSections : initialClassSections;
  const subjectOptions = useSubjects();
  const subjectRows = useSubjectRows();
  const [addSubjectQuery, setAddSubjectQuery] = useState('');
  const [addSubjectTypeFilter, setAddSubjectTypeFilter] = useState('All');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  // Always the Topbar's active session (see page.jsx) — this page never
  // offers its own session picker, same convention as Classes/Attendance.
  const academicSession = initialSession;
  const [hasInitializedFromUrl, setHasInitializedFromUrl] = useState(false);
  const [schedule, setSchedule] = useState(null);
  const [savedSchedule, setSavedSchedule] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [activeDay, setActiveDay] = useState(todaysDay);
  const [sessionMinutes, setSessionMinutes] = useState(DEFAULT_DURATION);
  const [popover, setPopover] = useState(null); // { kind: 'period'|'cell'|'add', day?, periodId }
  const [menuOpen, setMenuOpen] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const anchorElRef = useRef(null);
  const menuAnchorRef = useRef(null);

  const classOptions = useMemo(
    () => Object.keys(effectiveClassSections).map((c) => ({ value: c, label: c })),
    [effectiveClassSections]
  );
  const sectionOptions = useMemo(
    () => getSectionOptions(effectiveClassSections, selectedClass),
    [effectiveClassSections, selectedClass]
  );
  // Pre-primary classes (Nursery/Playway/LKG/UKG, ...) commonly have no
  // Section rows at all — a class with zero sections doesn't need one
  // picked before its (whole-class) timetable can load, same convention as
  // Print Marksheet/exam schedules treating a blank sectionName as "the
  // whole class" rather than blocking on an impossible section pick.
  const classNeedsSection = selectedClass ? classHasSections(effectiveClassSections, selectedClass) : true;

  // Picks up the class/section from the URL (?class=&section=) so a
  // refresh (or a shared link) lands back on the same class — falls back to
  // Nursery as the default when there's no URL and no prior selection yet.
  // Runs once classOptions is actually populated, and only once ever. The
  // academic session itself always comes from the Topbar's active session
  // (see page.jsx), never from the URL — same single-source-of-truth
  // convention as Classes/Attendance/Reports.
  useEffect(() => {
    if (hasInitializedFromUrl || classOptions.length === 0) return;
    const urlClass = searchParams.get('class');
    if (urlClass && classOptions.some((c) => c.value === urlClass)) {
      setSelectedClass(urlClass);
      setSelectedSection(searchParams.get('section') || '');
    } else {
      const defaultClass = classOptions.some((c) => c.value === 'Nursery') ? 'Nursery' : classOptions[0].value;
      setSelectedClass(defaultClass);
    }
    setHasInitializedFromUrl(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classOptions, hasInitializedFromUrl]);

  // Keeps the URL in sync with whatever's currently selected, so a browser
  // refresh (handled by the effect above) restores it.
  useEffect(() => {
    if (!hasInitializedFromUrl || !selectedClass) return;
    const params = new URLSearchParams();
    params.set('class', selectedClass);
    if (selectedSection) params.set('section', selectedSection);
    params.set('session', academicSession);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass, selectedSection, academicSession, hasInitializedFromUrl]);

  const isDirty = schedule && savedSchedule && JSON.stringify(schedule) !== JSON.stringify(savedSchedule);

  const loadTimeTable = (className, sectionName, session) => {
    setSchedule(null);
    if (!className) return;
    if (classHasSections(effectiveClassSections, className) && !sectionName) return;
    setIsLoading(true);
    getTimeTable({ className, sectionName, academicSession: session })
      .then((data) => {
        setSchedule(data.schedule);
        setSavedSchedule(data.schedule);
        const firstPeriod = data.schedule.periods.find((p) => !p.isBreak);
        setSessionMinutes(firstPeriod?.duration || DEFAULT_DURATION);
      })
      .catch((err) => setToastMessage(err.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadTimeTable(selectedClass, selectedSection, academicSession);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass, selectedSection, academicSession]);

  const guardedSwitch = (fn) => {
    if (isDirty && !window.confirm('You have unsaved changes. Discard them?')) return;
    fn();
  };

  const handleSave = async ({ silent = false } = {}) => {
    setIsSaving(true);
    try {
      const result = await saveTimeTable({ className: selectedClass, sectionName: selectedSection, academicSession, schedule });
      setSavedSchedule(result.schedule);
      if (!silent) setToastMessage('Timetable saved successfully.');
      return true;
    } catch (err) {
      setToastMessage(err.message);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // "Manage Subjects" always saves whatever's currently on screen first —
  // leaving without saving would silently discard it, since this whole
  // editor only auto-loads from the DB, it never auto-saves (see
  // handleSave's own explicit "Save Timetable" button).
  const handleManageSubjectsClick = async (e) => {
    e.preventDefault();
    const saved = schedule ? await handleSave({ silent: true }) : true;
    if (saved) router.push('/dashboard/academics/subjects');
  };

  const openPopover = (e, p) => {
    anchorElRef.current = e.currentTarget;
    setPopover(p);
  };
  const closePopover = () => {
    setPopover(null);
    setAddSubjectQuery('');
    setAddSubjectTypeFilter('All');
  };

  const periods = useMemo(() => withPeriodTimes(schedule?.dayStartTime || '07:00', schedule?.periods || []), [schedule]);

  const addPeriod = () => {
    const newPeriod = { id: `${Date.now()}`, duration: sessionMinutes, isBreak: false };
    setSchedule((s) => ({ ...s, periods: [...s.periods, newPeriod] }));
  };

  // Applies to every non-break period at once — the break's own duration
  // (lunch etc.) is left untouched, still only editable per-period via its
  // own header popover, since a school's lunch length rarely matches its
  // regular class length.
  const applySessionMinutes = (minutes) => {
    setSessionMinutes(minutes);
    setSchedule((s) => (s ? { ...s, periods: s.periods.map((p) => (p.isBreak ? p : { ...p, duration: minutes })) } : s));
  };

  const updatePeriod = (periodId, patch) => {
    setSchedule((s) => ({ ...s, periods: s.periods.map((p) => (p.id === periodId ? { ...p, ...patch } : p)) }));
  };

  const deletePeriod = (periodId) => {
    setSchedule((s) => {
      const cells = Object.fromEntries(DAYS.map((d) => [d, { ...s.cells[d] }]));
      DAYS.forEach((d) => delete cells[d][periodId]);
      return { ...s, periods: s.periods.filter((p) => p.id !== periodId), cells };
    });
    closePopover();
  };

  const markPeriodAsBreak = (periodId) => {
    setSchedule((s) => {
      const cells = Object.fromEntries(DAYS.map((d) => [d, { ...s.cells[d] }]));
      DAYS.forEach((d) => delete cells[d][periodId]);
      return { ...s, periods: s.periods.map((p) => (p.id === periodId ? { ...p, isBreak: true } : p)), cells };
    });
  };

  const unmarkPeriodBreak = (periodId) => {
    setSchedule((s) => ({ ...s, periods: s.periods.map((p) => (p.id === periodId ? { ...p, isBreak: false } : p)) }));
  };

  const assignCell = (day, periodId, subject) => {
    setSchedule((s) => ({ ...s, cells: { ...s.cells, [day]: { ...s.cells[day], [periodId]: { subject } } } }));
    closePopover();
  };

  const removeCell = (day, periodId) => {
    setSchedule((s) => {
      const dayCells = { ...s.cells[day] };
      delete dayCells[periodId];
      return { ...s, cells: { ...s.cells, [day]: dayCells } };
    });
    closePopover();
  };

  const clearAll = () => {
    setSchedule((s) => ({ ...s, cells: Object.fromEntries(DAYS.map((d) => [d, {}])) }));
    setConfirmClearAll(false);
    setMenuOpen(false);
  };

  const setDayStartTime = (value) => {
    setSchedule((s) => (s ? { ...s, dayStartTime: value } : s));
  };

  // Dragging a period's header reorders the shared `periods` array — every
  // day's columns follow, since cells are keyed by periodId, not position.
  const handlePeriodDragStart = (e, periodId) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ kind: 'period', periodId }));
  };

  const handlePeriodDrop = (e, targetPeriodId) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('text/plain');
    if (!raw) return;
    const payload = JSON.parse(raw);
    if (payload.kind !== 'period' || payload.periodId === targetPeriodId) return;
    setSchedule((s) => {
      const list = [...s.periods];
      const fromIndex = list.findIndex((p) => p.id === payload.periodId);
      const toIndex = list.findIndex((p) => p.id === targetPeriodId);
      if (fromIndex === -1 || toIndex === -1) return s;
      const [moved] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, moved);
      return { ...s, periods: list };
    });
  };

  // Dragging an already-assigned subject chip moves it to any other
  // non-break cell (same day or a different one) — dropping onto a filled
  // cell overwrites whatever was there.
  const handleCellDragStart = (e, day, periodId) => {
    e.dataTransfer.effectAllowed = 'copyMove';
    e.dataTransfer.setData('text/plain', JSON.stringify({ kind: 'cell', day, periodId }));
  };

  // Holding Ctrl (Cmd on Mac) while dropping copies the subject into the
  // target cell instead of moving it — same convention as dragging files in
  // Windows/macOS Explorer. Checked at drop time (not dragstart), since
  // that's the moment that actually decides the outcome.
  const handleCellDrop = (e, targetDay, targetPeriodId) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('text/plain');
    if (!raw) return;
    const payload = JSON.parse(raw);
    if (payload.kind !== 'cell') return;
    if (payload.day === targetDay && payload.periodId === targetPeriodId) return;
    const isCopy = e.ctrlKey || e.metaKey;
    setSchedule((s) => {
      const moved = s.cells[payload.day]?.[payload.periodId];
      if (!moved) return s;

      if (isCopy) {
        return { ...s, cells: { ...s.cells, [targetDay]: { ...s.cells[targetDay], [targetPeriodId]: moved } } };
      }

      const sourceDayCells = { ...s.cells[payload.day] };
      delete sourceDayCells[payload.periodId];
      // Same object reference for both keys when moving within one day, so
      // the deletion above and the addition below land on the same cells
      // map instead of one silently overwriting the other.
      const targetDayCells = payload.day === targetDay ? sourceDayCells : { ...s.cells[targetDay] };
      targetDayCells[targetPeriodId] = moved;
      return { ...s, cells: { ...s.cells, [payload.day]: sourceDayCells, [targetDay]: targetDayCells } };
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Timetable</h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage class timetables with subjects and breaks.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowViewModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition cursor-pointer"
          >
            <FiEye className="w-4 h-4" />
            View Timetables
          </button>
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={!schedule || isSaving}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiSave className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Timetable'}
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Class</label>
            <Dropdown
              placeholder="Select class"
              icon={<FiLayers className="w-4 h-4" />}
              options={classOptions}
              value={selectedClass}
              onChange={(v) => guardedSwitch(() => {
                setSelectedClass(v);
                setSelectedSection('');
              })}
              searchable
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Section</label>
            <Dropdown
              placeholder={
                !selectedClass ? 'Select a class first' : classNeedsSection ? 'Select section' : 'No sections for this class'
              }
              icon={<FiGrid className="w-4 h-4" />}
              options={sectionOptions}
              value={selectedSection}
              onChange={(v) => guardedSwitch(() => setSelectedSection(v))}
              disabled={!selectedClass || !classNeedsSection}
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Class starts at</label>
            <TimePicker value={schedule?.dayStartTime || '07:00'} onChange={setDayStartTime} />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Class duration</label>
            <Dropdown
              icon={<FiClock className="w-4 h-4" />}
              options={DURATION_OPTIONS.map((d) => ({ value: String(d), label: `${d} min` }))}
              value={String(sessionMinutes)}
              onChange={(v) => applySessionMinutes(Number(v))}
              disabled={!schedule}
            />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => setShowCopyModal(true)}
              disabled={!schedule}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiCopy className="w-4 h-4" />
              Copy Timetable
            </button>
            <button
              ref={menuAnchorRef}
              type="button"
              onClick={(e) => {
                anchorElRef.current = e.currentTarget;
                setMenuOpen((v) => !v);
              }}
              className="p-2.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition cursor-pointer"
            >
              <FiMoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {!selectedClass || (classNeedsSection && !selectedSection) ? (
        <p className="text-sm text-gray-500 text-center py-16">Pick a class and section to build its timetable.</p>
      ) : isLoading || !schedule ? (
        <p className="text-sm text-gray-500 text-center py-16">Loading...</p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="inline-flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1.5">
              {DAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setActiveDay(day)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                    activeDay === day ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={addPeriod}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm text-indigo-600 border border-dashed border-indigo-200 hover:bg-indigo-50 transition cursor-pointer"
              >
                <FiPlus className="w-4 h-4" />
                Add Period
              </button>
              <a
                href="/dashboard/academics/subjects"
                onClick={handleManageSubjectsClick}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition cursor-pointer"
              >
                <FiSettings className="w-4 h-4" />
                Manage Subjects
              </a>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
                <div
                  className="grid"
                  style={{ gridTemplateColumns: `110px repeat(${Math.max(periods.length, 1)}, minmax(96px, 1fr))` }}
                >
                  <div className="px-3 py-3 border-b border-r border-gray-100 bg-gray-50">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Period</p>
                  </div>
                  {periods.length === 0 && (
                    <div className="px-3 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-center text-xs text-gray-400">
                      Add a period to begin
                    </div>
                  )}
                  {periods.map((period) => (
                    <button
                      key={period.id}
                      type="button"
                      draggable
                      onDragStart={(e) => handlePeriodDragStart(e, period.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handlePeriodDrop(e, period.id)}
                      onClick={(e) => openPopover(e, { kind: 'period', periodId: period.id })}
                      className={`px-2 py-2 border-b border-gray-100 text-center cursor-grab active:cursor-grabbing transition hover:bg-gray-100 ${
                        period.isBreak ? 'bg-gray-100' : 'bg-gray-50'
                      }`}
                    >
                      <p className={`text-sm font-semibold ${period.isBreak ? 'text-gray-500' : 'text-gray-800'}`}>
                        {period.isBreak ? 'Break' : period.periodNumber}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5 whitespace-nowrap">
                        {period.startLabel} - {period.endLabel}
                      </p>
                    </button>
                  ))}

                  {DAYS.map((day) => (
                    <Fragment key={day}>
                      <div
                        key={`${day}-label`}
                        className={`px-3 py-2 flex items-center border-r border-gray-100 ${
                          activeDay === day ? 'border-l-4 border-l-indigo-600 bg-indigo-50/40' : 'border-l-4 border-l-transparent'
                        }`}
                      >
                        <span className={`text-sm ${activeDay === day ? 'font-bold text-indigo-900' : 'font-medium text-gray-600'}`}>
                          {day}
                        </span>
                      </div>
                      {periods.length === 0 && <div key={`${day}-empty`} className="px-2 py-2" />}
                      {periods.map((period) => {
                        if (period.isBreak) {
                          return <div key={`${day}-${period.id}`} className="bg-gray-50/60 m-1 rounded-lg" />;
                        }
                        const cell = schedule.cells[day]?.[period.id];
                        if (cell) {
                          const color = subjectColor(cell.subject, subjectOptions);
                          const code = subjectRows.find((s) => s.name === cell.subject)?.code || subjectInitials(cell.subject);
                          return (
                            <button
                              key={`${day}-${period.id}`}
                              type="button"
                              draggable
                              onDragStart={(e) => handleCellDragStart(e, day, period.id)}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = e.ctrlKey || e.metaKey ? 'copy' : 'move';
                              }}
                              onDrop={(e) => handleCellDrop(e, day, period.id)}
                              onClick={(e) => openPopover(e, { kind: 'cell', day, periodId: period.id })}
                              className={`m-1 rounded-lg border px-1.5 py-1.5 text-left transition hover:opacity-80 cursor-grab active:cursor-grabbing ${color.bg} ${color.border}`}
                            >
                              <p className={`text-[10px] font-bold ${color.text}`}>{code}</p>
                              <p className={`text-[10px] font-medium ${color.text} truncate`}>{cell.subject}</p>
                            </button>
                          );
                        }
                        return (
                          <button
                            key={`${day}-${period.id}`}
                            type="button"
                            onClick={(e) => openPopover(e, { kind: 'add', day, periodId: period.id })}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = e.ctrlKey || e.metaKey ? 'copy' : 'move';
                            }}
                            onDrop={(e) => handleCellDrop(e, day, period.id)}
                            className="m-1 rounded-lg border border-dashed border-gray-200 text-gray-300 hover:border-indigo-300 hover:text-indigo-400 hover:bg-indigo-50/40 transition cursor-pointer flex items-center justify-center py-3"
                          >
                            <span className="text-[10px] font-medium flex items-center gap-1">
                              <FiPlus className="w-3 h-3" />
                              Add
                            </span>
                          </button>
                        );
                      })}
                    </Fragment>
                  ))}
                </div>
              </div>
            </div>
        </>
      )}

      <TapPopover anchorRef={anchorElRef} isOpen={Boolean(popover)} onClose={closePopover} width={popover?.kind === 'add' ? 260 : 280}>
        {popover?.kind === 'add' &&
          (() => {
            const filteredRows = subjectRows.filter((s) => {
              if (addSubjectTypeFilter !== 'All' && s.type !== addSubjectTypeFilter) return false;
              if (addSubjectQuery.trim() && !s.name.toLowerCase().includes(addSubjectQuery.trim().toLowerCase())) return false;
              return true;
            });
            return (
              <div className="w-64 -m-3 rounded-xl overflow-hidden">
                <div className="p-2.5 pb-1.5">
                  <div className="relative">
                    <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3 h-3" />
                    <input
                      type="text"
                      autoFocus
                      value={addSubjectQuery}
                      onChange={(e) => setAddSubjectQuery(e.target.value)}
                      placeholder="Search subjects..."
                      autoComplete="off"
                      className="w-full pl-7 pr-2.5 py-1.5 text-[11px] bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    {['All', 'Theory', 'Practical'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setAddSubjectTypeFilter(type)}
                        className={`text-[11px] font-medium rounded-full px-2 py-1 transition cursor-pointer ${
                          addSubjectTypeFilter === type
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="max-h-[112px] overflow-y-auto border-t border-gray-100">
                  {filteredRows.map((subject) => (
                    <button
                      key={subject.id}
                      type="button"
                      onClick={() => assignCell(popover.day, popover.periodId, subject.name)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left hover:bg-indigo-50/70 transition cursor-pointer"
                    >
                      <span className="text-[11px] text-gray-800 truncate">{subject.name}</span>
                      {subject.code && (
                        <span className="text-[10px] font-medium text-gray-500 bg-gray-100 rounded-full px-1.5 py-0.5 shrink-0">
                          {subject.code}
                        </span>
                      )}
                    </button>
                  ))}
                  {filteredRows.length === 0 && <p className="text-[11px] text-gray-400 text-center py-6">No subjects found.</p>}
                </div>

                <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100">
                  <span className="text-[11px] text-gray-400">Total {subjectRows.length} subjects</span>
                  <a
                    href="/dashboard/academics/subjects"
                    onClick={handleManageSubjectsClick}
                    className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer"
                  >
                    Manage Subjects
                  </a>
                </div>
              </div>
            );
          })()}

        {popover?.kind === 'cell' &&
          (() => {
            const cell = schedule.cells[popover.day]?.[popover.periodId];
            if (!cell) return null;
            return (
              <div className="w-48 space-y-2">
                <p className="text-xs font-semibold text-gray-700">{cell.subject}</p>
                <button
                  type="button"
                  onClick={() => removeCell(popover.day, popover.periodId)}
                  className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg py-1.5 border-t border-gray-100 pt-2.5 cursor-pointer"
                >
                  <FiX className="w-3.5 h-3.5" />
                  Remove
                </button>
              </div>
            );
          })()}

        {popover?.kind === 'period' &&
          (() => {
            const period = schedule.periods.find((p) => p.id === popover.periodId);
            if (!period) return null;
            return (
              <div className="w-56 space-y-3">
                <div>
                  <p className="text-[11px] font-medium text-gray-500 mb-1.5">Duration (minutes)</p>
                  <div className="flex flex-wrap gap-1">
                    {DURATION_OPTIONS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => updatePeriod(period.id, { duration: d })}
                        className={`text-xs font-medium rounded-lg px-2 py-1 border transition cursor-pointer ${
                          (period.duration || DEFAULT_DURATION) === d
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => (period.isBreak ? unmarkPeriodBreak(period.id) : markPeriodAsBreak(period.id))}
                    className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium rounded-lg py-1.5 border transition cursor-pointer ${
                      period.isBreak ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <FiCoffee className="w-3.5 h-3.5" />
                    {period.isBreak ? 'Unmark as break' : 'Mark as break'}
                  </button>
                  <button
                    type="button"
                    onClick={closePopover}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer"
                  >
                    Save
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => deletePeriod(period.id)}
                  className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg py-1.5 border-t border-gray-100 pt-2.5 cursor-pointer"
                >
                  <FiX className="w-3.5 h-3.5" />
                  Delete this period
                </button>
              </div>
            );
          })()}
      </TapPopover>

      <TapPopover anchorRef={menuAnchorRef} isOpen={menuOpen} onClose={() => setMenuOpen(false)}>
        <div className="w-52 space-y-1">
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setConfirmClearAll(true);
            }}
            className="w-full text-left text-xs font-medium text-gray-700 hover:bg-gray-50 rounded-lg px-2.5 py-2 cursor-pointer"
          >
            Clear whole timetable
          </button>
        </div>
      </TapPopover>

      <ConfirmDialog
        isOpen={confirmClearAll}
        onClose={() => setConfirmClearAll(false)}
        onConfirm={clearAll}
        title="Clear Whole Timetable"
        description="Remove every period assigned across all six days? This can't be undone once saved."
        confirmLabel="Clear All"
      />

      {showViewModal && (
        <ViewTimetablesModal
          academicSession={academicSession}
          onClose={() => setShowViewModal(false)}
          onOpen={(cls, sec) =>
            guardedSwitch(() => {
              setSelectedClass(cls);
              setSelectedSection(sec);
              setShowViewModal(false);
            })
          }
        />
      )}

      {showCopyModal && (
        <CopyTimetableModal
          classSections={effectiveClassSections}
          currentClass={selectedClass}
          currentSection={selectedSection}
          academicSession={academicSession}
          schedule={schedule}
          onClose={() => setShowCopyModal(false)}
          onCopied={(msg) => {
            setShowCopyModal(false);
            setToastMessage(msg);
          }}
        />
      )}

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}

function ViewTimetablesModal({ academicSession, onClose, onOpen }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    listTimeTables(academicSession)
      .then(setRows)
      .catch((err) => setError(err.message));
  }, [academicSession]);

  const handleDelete = async () => {
    try {
      await deleteTimeTable({ className: deleteTarget.className, sectionName: deleteTarget.sectionName, academicSession });
      setRows((prev) => prev.filter((r) => r !== deleteTarget));
      setDeleteTarget(null);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl h-[50vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="font-semibold text-gray-900">Saved Timetables — {academicSession}</p>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer">
            <FiX className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-3">
          {error && <p className="text-sm text-red-500 px-2 py-2">{error}</p>}
          {rows === null ? (
            <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No timetables saved yet for this term.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {rows.map((row) => (
                <div
                  key={`${row.className}-${row.sectionName}`}
                  className="relative border border-gray-200 rounded-lg hover:border-indigo-200 hover:bg-indigo-50/40 transition"
                >
                  <button type="button" onClick={() => onOpen(row.className, row.sectionName)} className="w-full text-left px-3 py-2.5 cursor-pointer">
                    <p className="text-sm font-medium text-gray-900 truncate pr-5">
                      {row.className}
                      {row.sectionName && ` — ${row.sectionName}`}
                    </p>
                    <span
                      className={`inline-block mt-1 text-[11px] font-semibold px-1.5 py-0.5 rounded ${
                        row.total > 0 && row.filled === row.total
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {row.total > 0 && row.filled === row.total ? 'Complete' : 'Incomplete'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(row)}
                    className="absolute top-1.5 right-1.5 p-1 rounded text-gray-300 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                  >
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Timetable"
        description={
          deleteTarget
            ? `Permanently delete the timetable for ${deleteTarget.className}${
                deleteTarget.sectionName ? ` — Section ${deleteTarget.sectionName}` : ''
              }?`
            : ''
        }
        confirmLabel="Delete"
      />
    </div>
  );
}

function CopyTimetableModal({ classSections, currentClass, currentSection, academicSession, schedule, onClose, onCopied }) {
  const [targetClass, setTargetClass] = useState('');
  const [targetSection, setTargetSection] = useState('');
  const [isCopying, setIsCopying] = useState(false);
  const [error, setError] = useState('');

  const classOptions = Object.keys(classSections).map((c) => ({ value: c, label: c }));
  const sectionOptions = getSectionOptions(classSections, targetClass);
  const targetNeedsSection = targetClass ? classHasSections(classSections, targetClass) : true;

  const handleCopy = async () => {
    setError('');
    if (!targetClass || (targetNeedsSection && !targetSection)) {
      setError('Pick a target class and section.');
      return;
    }
    if (targetClass === currentClass && targetSection === currentSection) {
      setError('Pick a different class or section to copy into.');
      return;
    }
    setIsCopying(true);
    try {
      await saveTimeTable({ className: targetClass, sectionName: targetSection, academicSession, schedule });
      onCopied(`Copied to ${targetClass}${targetSection ? ` — Section ${targetSection}` : ''}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <p className="font-semibold text-gray-900 mb-1">Copy Timetable</p>
        <p className="text-sm text-gray-500 mb-4">
          Copy {currentClass}
          {currentSection ? ` — Section ${currentSection}` : ''}'s current timetable onto another class/section (overwrites it).
        </p>
        {error && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-3">{error}</p>}
        <div className="space-y-3">
          <Dropdown
            placeholder="Target class"
            icon={<FiLayers className="w-4 h-4" />}
            options={classOptions}
            value={targetClass}
            onChange={(v) => {
              setTargetClass(v);
              setTargetSection('');
            }}
            searchable
          />
          <Dropdown
            placeholder={
              !targetClass ? 'Select a class first' : targetNeedsSection ? 'Target section' : 'No sections for this class'
            }
            icon={<FiGrid className="w-4 h-4" />}
            options={sectionOptions}
            value={targetSection}
            onChange={setTargetSection}
            disabled={!targetClass || !targetNeedsSection}
          />
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 cursor-pointer">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={isCopying}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            {isCopying ? 'Copying...' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}
