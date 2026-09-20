// Client-safe constants for the Leave module — same split as
// lib/calendarEventConstants.js, so Client Components never pull in
// lib/teacherLeaves.js's Prisma/resolveSchoolId dependency.
export const LEAVE_TYPES = ['Casual', 'Sick', 'Earned', 'Other'];

export const LEAVE_TYPE_OPTIONS = LEAVE_TYPES.map((type) => ({ value: type, label: type }));

export const LEAVE_STATUS_STYLES = {
  Pending: 'bg-amber-50 text-amber-700',
  Approved: 'bg-green-50 text-green-700',
  Rejected: 'bg-red-50 text-red-600',
};

export const LEAVE_STATUS_FILTER_PILLS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'Pending' },
  { label: 'Approved', value: 'Approved' },
  { label: 'Rejected', value: 'Rejected' },
];
