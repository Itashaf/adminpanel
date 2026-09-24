// Client-safe constants for the Monthly Assessment module — same split as
// lib/leaveConstants.js/lib/calendarEventConstants.js, so Client Components
// never pull in lib/studentAssessments.js's Prisma/resolveSchoolId
// dependency.

// 5 steps (was 7) — Attendance+Monthly Tests merged into "Academic",
// Holistic Dev. renamed "Development", Co-Curricular renamed "Activities",
// Concise Report kept standalone per explicit choice. Last step is just the
// Teacher Remarks & Action Plan form now (the earlier per-section recap
// grid was dropped) — submit still lives here, no separate Review step.
export const WIZARD_STEPS = [
  { key: 'academic', label: 'Academic' },
  { key: 'development', label: 'Development' },
  { key: 'activities', label: 'Activities' },
  { key: 'concise', label: 'Concise Report' },
  { key: 'remarks', label: 'Remarks' },
];

// Concise Report — every field here is chosen via tap-to-select colored
// dots (same pattern as Academic Performance/Holistic Development), not a
// dropdown. Each *_DOT_COLORS map pairs with its own options list below.
export const YES_NO_OPTIONS = ['Yes', 'No'];
export const YES_NO_DOT_COLORS = { Yes: 'bg-green-500', No: 'bg-red-500' };

export const PTM_ATTENDED_OPTIONS = ['Attended', 'Not Attended'];
export const PTM_ATTENDED_DOT_COLORS = { Attended: 'bg-green-500', 'Not Attended': 'bg-red-500' };

export const HEALTH_STATUS_OPTIONS = ['Good', 'Fair', 'Needs Attention'];

export const HEALTH_STATUS_DOT_COLORS = {
  Good: 'bg-green-500',
  Fair: 'bg-amber-500',
  'Needs Attention': 'bg-red-500',
};

// Overall Progress reuses RATING_LEVELS (Excellent/Good/Average/Needs
// Improvement) — same field (StudentAssessment.overallPerformance) the
// Bulk Assessment Mode picker and "Complete in 30s" quick modal also write,
// so all three stay on one consistent 4-level scale.
export const OVERALL_PROGRESS_DOT_COLORS = {
  Excellent: 'bg-green-500',
  Good: 'bg-blue-500',
  Average: 'bg-amber-500',
  'Needs Improvement': 'bg-red-500',
};

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

// Holistic Development's rating scale — one level richer than RATING_LEVELS
// (adds "Very Good"). Chosen via tap-to-select colored dots, same
// interaction as Academic Performance's ACADEMIC_RATING_DOT_COLORS.
export const HOLISTIC_RATING_LEVELS = ['Excellent', 'Very Good', 'Good', 'Average', 'Needs Improvement'];

export const HOLISTIC_RATING_DOT_COLORS = {
  Excellent: 'bg-green-500',
  'Very Good': 'bg-teal-500',
  Good: 'bg-blue-500',
  Average: 'bg-yellow-400',
  'Needs Improvement': 'bg-red-500',
};

export const RATING_STYLES = {
  Excellent: 'bg-green-50 text-green-700 border-green-200',
  'Very Good': 'bg-teal-50 text-teal-700 border-teal-200',
  Good: 'bg-blue-50 text-blue-700 border-blue-200',
  Average: 'bg-amber-50 text-amber-700 border-amber-200',
  'Needs Improvement': 'bg-red-50 text-red-600 border-red-200',
};

// Used only when a class has no Subjects configured yet (see lib/subjects.js)
// — a sane starting point rather than an empty Academics step.
export const FALLBACK_SUBJECTS = ['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies'];

// Academic Performance — one tap-to-select colored dot per subject per
// rating (green/blue/yellow/red), replacing an earlier detailed per-subject
// test-table design (Test/Chapter, Max, Obtained, Intervention, Work
// Completion, Subject Enrichment) that was too slow to fill for a whole
// class. Same RATING_LEVELS order/meaning, just a faster one-tap input.
export const ACADEMIC_RATING_DOT_COLORS = {
  Excellent: 'bg-green-500',
  Good: 'bg-blue-500',
  Average: 'bg-yellow-400',
  'Needs Improvement': 'bg-red-500',
};

// Co-Curricular Activities — each entry a Type + a Type-specific option (a
// fixed list for Competition/Olympiad/Sports, free text for "Activity" —
// see ACTIVITY_TYPE_OPTIONS below) + an Achievement. A student can have
// several entries (the step's "Add Another Activity" button), not just one.
export const ACTIVITY_TYPES = ['Competition', 'Olympiad', 'Sports', 'Activity'];

// No entry for 'Activity' — that type is free text, not a fixed list.
export const ACTIVITY_TYPE_OPTIONS = {
  Competition: ['Debate', 'Elocution', 'Recitation', 'Quiz', 'Spell Bell', 'Poster Making'],
  Olympiad: ['Maths', 'Science', 'Computer', 'GK', 'English', 'Hindi'],
  Sports: ['Taekwondo', 'Cricket', 'Volleyball', 'Basketball', 'Kho-Kho', 'Badminton', 'Table Tennis', 'S&G'],
};

// Every fixed (non-free-text) option flattened, used only to seed the
// Reports "Activity Participation" chart's zero counts — lib/studentAssessments.js's
// getClassAssessmentSummary tallies each entry's chosen option into this.
export const ACTIVITY_OPTIONS = Object.values(ACTIVITY_TYPE_OPTIONS).flat();

export const ACHIEVEMENT_LEVELS = ['1st', '2nd', '3rd', 'Participant'];

export const ASSESSMENT_STATUS_STYLES = {
  'Not Started': 'bg-gray-100 text-gray-500',
  Draft: 'bg-amber-50 text-amber-700',
  Completed: 'bg-green-50 text-green-700',
};
