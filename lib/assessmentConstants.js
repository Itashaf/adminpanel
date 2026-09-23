// Client-safe constants for the Monthly Assessment module — same split as
// lib/leaveConstants.js/lib/calendarEventConstants.js, so Client Components
// never pull in lib/studentAssessments.js's Prisma/resolveSchoolId
// dependency.

export const WIZARD_STEPS = [
  { key: 'attendance', label: 'Attendance' },
  { key: 'cocurricular', label: 'Co-Curricular' },
  { key: 'holistic', label: 'Holistic Dev.' },
  { key: 'concise', label: 'Concise Report' },
  { key: 'remarks', label: 'Teacher Remarks' },
  { key: 'tests', label: 'Monthly Tests' },
  { key: 'review', label: 'Review' },
];

export const OVERALL_PERFORMANCE_OPTIONS = ['Excellent', 'Very Good', 'Good', 'Average', 'Needs Attention'];

export const OVERALL_TAGS = ['Improved', 'Consistent', 'Outstanding', 'Irregular', 'Needs Support'];

export const BEHAVIOUR_CATEGORIES = [
  { key: 'discipline', label: 'Discipline' },
  { key: 'respect', label: 'Respect' },
  { key: 'participation', label: 'Class Participation' },
  { key: 'homework', label: 'Homework' },
  { key: 'punctuality', label: 'Punctuality' },
  { key: 'leadership', label: 'Leadership' },
  { key: 'communication', label: 'Communication' },
  { key: 'teamwork', label: 'Teamwork' },
];

// Shared by Behaviour and Academics — 4-level, chip-based, no dropdowns/
// textareas per the design spec.
export const RATING_LEVELS = ['Excellent', 'Good', 'Average', 'Needs Improvement'];

export const RATING_STYLES = {
  Excellent: 'bg-green-50 text-green-700 border-green-200',
  Good: 'bg-blue-50 text-blue-700 border-blue-200',
  Average: 'bg-amber-50 text-amber-700 border-amber-200',
  'Needs Improvement': 'bg-red-50 text-red-600 border-red-200',
};

export const OVERALL_PERFORMANCE_STYLES = {
  Excellent: 'bg-green-50 text-green-700 border-green-200',
  'Very Good': 'bg-teal-50 text-teal-700 border-teal-200',
  Good: 'bg-blue-50 text-blue-700 border-blue-200',
  Average: 'bg-amber-50 text-amber-700 border-amber-200',
  'Needs Attention': 'bg-red-50 text-red-600 border-red-200',
};

// Used only when a class has no Subjects configured yet (see lib/subjects.js)
// — a sane starting point rather than an empty Academics step.
export const FALLBACK_SUBJECTS = ['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies'];

export const ACTIVITY_OPTIONS = [
  'Sports',
  'Art',
  'Music',
  'Dance',
  'Debate',
  'Coding',
  'Reading',
  'Leadership',
  'Public Speaking',
];

export const ACHIEVEMENT_LEVELS = ['Participation', 'Good', 'Excellent', 'Outstanding'];

export const ASSESSMENT_STATUS_STYLES = {
  'Not Started': 'bg-gray-100 text-gray-500',
  Draft: 'bg-amber-50 text-amber-700',
  Completed: 'bg-green-50 text-green-700',
};
