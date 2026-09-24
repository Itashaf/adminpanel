// Client-safe constants for the Monthly Assessment module — same split as
// lib/leaveConstants.js/lib/calendarEventConstants.js, so Client Components
// never pull in lib/studentAssessments.js's Prisma/resolveSchoolId
// dependency.

// 5 steps (was 7) — Attendance+Monthly Tests merged into "Academic",
// Holistic Dev. renamed "Development", Co-Curricular renamed "Activities",
// Teacher Remarks renamed "Summary" (submit lives here, no separate Review
// step anymore), Concise Report kept standalone per explicit choice.
export const WIZARD_STEPS = [
  { key: 'academic', label: 'Academic' },
  { key: 'development', label: 'Development' },
  { key: 'activities', label: 'Activities' },
  { key: 'concise', label: 'Concise Report' },
  { key: 'summary', label: 'Summary' },
];

export const OVERALL_PERFORMANCE_OPTIONS = ['Excellent', 'Very Good', 'Good', 'Average', 'Needs Attention'];

export const OVERALL_TAGS = ['Improved', 'Consistent', 'Outstanding', 'Irregular', 'Needs Support'];

export const BEHAVIOUR_CATEGORIES = [
  { key: 'punctuality', label: 'Punctuality' },
  { key: 'classPreparation', label: 'Class Preparation' },
  { key: 'homeworkCompletion', label: 'Homework Completion' },
  { key: 'classroomBehaviour', label: 'Classroom Behaviour' },
  { key: 'discipline', label: 'Discipline' },
  { key: 'cleanliness', label: 'Cleanliness & Hygiene' },
  { key: 'valueEducation', label: 'Value Education' },
  { key: 'englishCommunication', label: 'English Communication' },
  { key: 'arabic', label: 'Arabic' },
  { key: 'sanskrit', label: 'Sanskrit' },
  { key: 'mathematicalSkills', label: 'Mathematical Skills' },
  { key: 'creativity', label: 'Creativity' },
];

// Shared by Academics — 4-level, chip-based, no dropdowns/textareas per the
// design spec.
export const RATING_LEVELS = ['Excellent', 'Good', 'Average', 'Needs Improvement'];

// Holistic Development's dropdown scale — one level richer than
// RATING_LEVELS (adds "Very Good", same as OVERALL_PERFORMANCE_OPTIONS) to
// match the reference design's dropdown values.
export const HOLISTIC_RATING_LEVELS = ['Excellent', 'Very Good', 'Good', 'Average', 'Needs Improvement'];

export const RATING_STYLES = {
  Excellent: 'bg-green-50 text-green-700 border-green-200',
  'Very Good': 'bg-teal-50 text-teal-700 border-teal-200',
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
