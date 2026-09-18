// Pure data/helpers, zero imports — same split as lib/classConstants.js/
// lib/noticeConstants.js so client components can use these without pulling
// lib/exams.js's Prisma/resolveSchoolId dependency into the browser bundle.

export const EXAM_TYPES = ['FA1', 'FA2', 'SA1', 'FA3', 'FA4', 'SA2'];

export const EXAM_STATUSES = ['Draft', 'Published', 'Completed'];

export const EXAM_MODES = ['Theory', 'Practical'];

export const EXAM_MARK_STATUSES = ['Draft', 'Submitted', 'UnderReview', 'Approved', 'Published'];

// Seeded into GradeScale for a school on first use (lib/exams.js's
// ensureGradeScale) — an admin can edit this per school later; nothing here
// is hardcoded into the actual grade-calculation logic itself.
export const DEFAULT_GRADE_SCALE = [
  { minPercent: 90, maxPercent: 100, grade: 'A+', isPass: true },
  { minPercent: 80, maxPercent: 89.99, grade: 'A', isPass: true },
  { minPercent: 70, maxPercent: 79.99, grade: 'B+', isPass: true },
  { minPercent: 60, maxPercent: 69.99, grade: 'B', isPass: true },
  { minPercent: 50, maxPercent: 59.99, grade: 'C', isPass: true },
  { minPercent: 33, maxPercent: 49.99, grade: 'D', isPass: true },
  { minPercent: 0, maxPercent: 32.99, grade: 'E', isPass: false },
];
