// Pure data/helpers, zero imports — split out of lib/classes.js so client
// components (ClassFormModal.jsx, SectionFormModal.jsx, SubjectsModal.jsx,
// HomeworkFormModal.jsx) can use these without pulling in that module's
// Prisma/resolveSchoolId's next/headers dependency into the browser bundle —
// same split as lib/feeConstants.js/lib/noticeConstants.js.
export const CLASS_STATUSES = ['Active', 'Inactive'];
export const SECTION_STATUSES = ['Active', 'Inactive'];

// Class Level → Class Name is a strict 1:1 mapping (Nursery..12), enforced in
// addClass/updateClass rather than trusting whatever `name` the client sends.
export const CLASS_LEVELS = [
  'Playway',
  'Nursery',
  'LKG',
  'UKG',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  '11',
  '12',
];

const PRE_PRIMARY_LEVELS = ['Nursery', 'Playway', 'LKG', 'UKG'];

export function classNameForLevel(level) {
  return PRE_PRIMARY_LEVELS.includes(level) ? level : `Class ${level}`;
}

export function wingForLevel(level) {
  if (PRE_PRIMARY_LEVELS.includes(level)) return 'Pre-Primary Wing';
  if (['1', '2', '3', '4', '5'].includes(level)) return 'Primary Wing';
  if (['6', '7', '8'].includes(level)) return 'Middle Wing';
  if (['9', '10'].includes(level)) return 'Secondary Wing';
  return 'Senior Secondary Wing';
}

export const SUBJECT_OPTIONS = [
  'English',
  'Mathematics',
  'Science',
  'Social Science',
  'Hindi',
  'EVS',
  'Computer Science',
  'Computer Applications',
  'Physics',
  'Chemistry',
  'Biology',
  'Economics',
  'Accountancy',
  'Business Studies',
  'Art & Craft',
  'Physical Education',
  'Music',
];

// Seed values for the Subjects screen's Code/Type columns (see
// lib/subjects.js's ensureSeeded) — only used the first time a school's
// Subject list is created, from the old hardcoded SUBJECT_OPTIONS. A code
// left blank here just falls back to the name's first 3 letters uppercased.
export const DEFAULT_SUBJECT_CODES = {
  English: 'ENG',
  Mathematics: 'MAT',
  Science: 'SCI',
  'Social Science': 'SOC',
  Hindi: 'HIN',
  EVS: 'EVS',
  'Computer Science': 'CS',
  'Computer Applications': 'CA',
  Physics: 'PHY',
  Chemistry: 'CHE',
  Biology: 'BIO',
  Economics: 'ECO',
  Accountancy: 'ACC',
  'Business Studies': 'BST',
  'Art & Craft': 'ART',
  'Physical Education': 'PE',
  Music: 'MUS',
};

export const DEFAULT_PRACTICAL_SUBJECTS = ['Art & Craft', 'Computer Applications', 'Physical Education', 'Music'];
