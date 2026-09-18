import { FiCheck, FiX, FiLogOut } from 'react-icons/fi';

// Single source of truth for attendance status colors/icons/labels — used by
// the roster grid, status pills, reports, the action bar and the student
// profile tab, so every surface stays visually consistent. `label` is the
// user-facing text (e.g. "Leave" is shown as "On Leave"); the object's own
// keys ('Present'/'Absent'/'Leave') are the stored status values and must
// not be renamed without updating lib/attendance.js. Only these three
// statuses are selectable — Late/NA were dropped as options (an older saved
// Attendance record could still technically contain one, but nothing in the
// UI can produce them anymore).
export const STATUS_META = {
  Present: {
    label: 'Present',
    shortLabel: 'P',
    icon: FiCheck,
    dot: 'bg-green-600',
    iconText: 'text-green-600',
    pill: 'bg-green-100 text-green-700',
    active: 'bg-green-600 text-white',
    card: 'bg-green-50 border-green-200 text-green-700',
  },
  Absent: {
    label: 'Absent',
    shortLabel: 'A',
    icon: FiX,
    dot: 'bg-red-500',
    iconText: 'text-red-500',
    pill: 'bg-red-100 text-red-600',
    active: 'bg-red-500 text-white',
    card: 'bg-red-50 border-red-200 text-red-600',
  },
  Leave: {
    label: 'On Leave',
    shortLabel: 'LV',
    icon: FiLogOut,
    dot: 'bg-blue-500',
    iconText: 'text-blue-500',
    pill: 'bg-blue-100 text-blue-700',
    active: 'bg-blue-500 text-white',
    card: 'bg-blue-50 border-blue-200 text-blue-700',
  },
};

export const STATUS_ORDER = ['Present', 'Absent', 'Leave'];

export function nextStatus(current) {
  const index = STATUS_ORDER.indexOf(current);
  return STATUS_ORDER[(index + 1) % STATUS_ORDER.length];
}

// Keyboard quick keys used by AttendanceRosterGrid: P/A/V set a status
// outright on the focused card (V for "leave" — mirrors common attendance-app
// conventions where L is already taken by... nothing anymore, but keeping V
// avoids retraining muscle memory from before Late existed).
export const STATUS_KEY_MAP = { p: 'Present', a: 'Absent', v: 'Leave' };
