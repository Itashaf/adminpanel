// Client-safe constants for Academics > Calendar — pure data, zero imports,
// same split as lib/noticeConstants.js so Client Components (the filter
// pills, the drawer's dropdowns/color selector) never pull in
// lib/calendarEvents.js's Prisma/resolveSchoolId dependency.
export const CALENDAR_CATEGORIES = ['Exam', 'Holiday', 'PTM', 'School Event', 'Admission', 'Deadline'];

export const CALENDAR_COLORS = ['Purple', 'Green', 'Orange', 'Blue', 'Red', 'Cyan'];

// One category → one default color, per the design spec. The drawer's Color
// Selector can still override this per-event (see CalendarEvent.color in
// prisma/schema.prisma) — this is only the default a new event starts with.
export const CATEGORY_COLOR_MAP = {
  Exam: 'Purple',
  Holiday: 'Green',
  'School Event': 'Orange',
  PTM: 'Blue',
  Deadline: 'Red',
  Admission: 'Cyan',
};

// Color name -> Tailwind classes, one lookup shared by the month grid's dot
// indicators/event chips, the Badge-style category chips, and the color
// selector swatches. `chip` is the light-tint pill used inside a calendar
// day cell (see MonthCalendarGrid.jsx) — distinct from `badge` (Badge.jsx's
// variant name) even though they resolve to the same two Tailwind classes,
// because a chip also needs its own hover/selected-day variants.
export const COLOR_STYLES = {
  Purple: { dot: 'bg-purple-500', badge: 'purple', ring: 'ring-purple-500', bg: 'bg-purple-500', chip: 'bg-purple-50 text-purple-700' },
  Green: { dot: 'bg-green-500', badge: 'green', ring: 'ring-green-500', bg: 'bg-green-500', chip: 'bg-green-50 text-green-700' },
  Orange: { dot: 'bg-orange-500', badge: 'orange', ring: 'ring-orange-500', bg: 'bg-orange-500', chip: 'bg-orange-50 text-orange-700' },
  Blue: { dot: 'bg-blue-500', badge: 'blue', ring: 'ring-blue-500', bg: 'bg-blue-500', chip: 'bg-blue-50 text-blue-700' },
  Red: { dot: 'bg-red-500', badge: 'red', ring: 'ring-red-500', bg: 'bg-red-500', chip: 'bg-red-50 text-red-700' },
  Cyan: { dot: 'bg-cyan-500', badge: 'cyan', ring: 'ring-cyan-500', bg: 'bg-cyan-500', chip: 'bg-cyan-50 text-cyan-700' },
};

export const CALENDAR_APPLIES_TO_TYPES = ['Whole School', 'Specific Class', 'Specific Section'];

// Human-readable "Applies To" summary shared by the month grid's day popup,
// the sidebar, and the table — 'Specific Class' lists every targeted class,
// 'Specific Section' every class+section pair, each comma-joined.
export function appliesToLabel(event) {
  if (event.appliesToType === 'Whole School') return 'Whole School';
  if (event.appliesToType === 'Specific Section') {
    return (event.appliesToSections || []).map((s) => `${s.class} • Sec ${s.section}`).join(', ') || 'No sections selected';
  }
  return (event.appliesToClasses || []).join(', ') || 'No classes selected';
}

// The month grid's legend row — one entry per category, in its
// CATEGORY_COLOR_MAP color, so it stays a fixed reference regardless of
// which events happen to be on screen (unlike the day cells' dots, which
// only show colors actually in use that month).
export const CALENDAR_LEGEND = CALENDAR_CATEGORIES.map((category) => ({
  category,
  color: CATEGORY_COLOR_MAP[category],
}));

// Filter pill label -> the `category` value it filters on. Labels are
// plural/short per the design spec ("Events" for School Event, "Admissions"
// for Admission) while the stored category stays singular — this is the one
// place that mapping happens, shared by the filter pills and the mobile tabs.
export const CALENDAR_FILTER_PILLS = [
  { label: 'All', value: '' },
  { label: 'Exams', value: 'Exam' },
  { label: 'Holidays', value: 'Holiday' },
  { label: 'Events', value: 'School Event' },
  { label: 'PTM', value: 'PTM' },
  { label: 'Admissions', value: 'Admission' },
  { label: 'Deadlines', value: 'Deadline' },
];
