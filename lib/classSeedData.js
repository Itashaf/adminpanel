// Same demo Classes/Sections roster lib/classes.js used to hold in in-memory
// arrays — moved out so prisma/seed.js can import it the same way it already
// imports lib/studentSeedData.js / lib/teacherSeedData.js. Sections reference
// their class by its seed `classKey` (not a real id — those only exist once
// Prisma assigns cuids at seed time) and their class teacher by employeeId
// (resolved against the already-seeded Teacher rows) rather than the old
// numeric '1'-'6' placeholder ids, which never correded to a real Teacher
// row even before this migration.
const PRE_PRIMARY_LEVELS = ['Nursery', 'Playway', 'LKG', 'UKG'];

// Duplicated from lib/classes.js's subjectsForLevel rather than imported —
// that file now has a module-scope Prisma import (once migrated), and this
// seed data must stay import-safe for prisma/seed.js's plain-Node context.
function subjectsForLevel(level) {
  if (PRE_PRIMARY_LEVELS.includes(level)) {
    return ['English', 'Mathematics', 'Art & Craft', 'Physical Education'];
  }
  if (['1', '2'].includes(level)) {
    return ['English', 'Mathematics', 'EVS', 'Art & Craft', 'Physical Education'];
  }
  if (['3', '4', '5'].includes(level)) {
    return ['English', 'Mathematics', 'EVS', 'Hindi', 'Computer Science', 'Physical Education'];
  }
  if (['6', '7', '8'].includes(level)) {
    return ['English', 'Mathematics', 'Science', 'Social Science', 'Hindi', 'Computer Science', 'Physical Education'];
  }
  if (['9', '10'].includes(level)) {
    return ['English', 'Mathematics', 'Science', 'Social Science', 'Hindi', 'Computer Applications'];
  }
  return ['English', 'Physics', 'Chemistry', 'Mathematics', 'Physical Education'];
}

export const SEED_CLASSES = [
  { classKey: 'c14', name: 'Nursery', level: 'Nursery', academicSession: '2026-27', status: 'Active' },
  { classKey: 'c15', name: 'Playway', level: 'Playway', academicSession: '2026-27', status: 'Active' },
  { classKey: 'c16', name: 'LKG', level: 'LKG', academicSession: '2026-27', status: 'Active' },
  { classKey: 'c7', name: 'UKG', level: 'UKG', academicSession: '2026-27', status: 'Active' },
  { classKey: 'c8', name: 'Class 1', level: '1', academicSession: '2026-27', status: 'Active' },
  { classKey: 'c9', name: 'Class 2', level: '2', academicSession: '2026-27', status: 'Active' },
  { classKey: 'c6', name: 'Class 3', level: '3', academicSession: '2026-27', status: 'Inactive' },
  { classKey: 'c5', name: 'Class 4', level: '4', academicSession: '2026-27', status: 'Active' },
  { classKey: 'c4', name: 'Class 5', level: '5', academicSession: '2026-27', status: 'Active' },
  { classKey: 'c3', name: 'Class 6', level: '6', academicSession: '2026-27', status: 'Active' },
  { classKey: 'c2', name: 'Class 7', level: '7', academicSession: '2026-27', status: 'Active' },
  { classKey: 'c1', name: 'Class 8', level: '8', academicSession: '2026-27', status: 'Active' },
  { classKey: 'c10', name: 'Class 9', level: '9', academicSession: '2026-27', status: 'Active' },
  { classKey: 'c11', name: 'Class 10', level: '10', academicSession: '2026-27', status: 'Active' },
  { classKey: 'c12', name: 'Class 11', level: '11', academicSession: '2026-27', status: 'Active' },
  { classKey: 'c13', name: 'Class 12', level: '12', academicSession: '2026-27', status: 'Active' },

  { classKey: 'c1p', name: 'Class 8', level: '8', academicSession: '2025-26', status: 'Active' },
  { classKey: 'c2p', name: 'Class 7', level: '7', academicSession: '2025-26', status: 'Active' },
].map((cls) => ({ ...cls, subjects: subjectsForLevel(cls.level) }));

// `classTeacherEmployeeId` references the seed teachers in lib/teacherSeedData.js
// (Rahul Kumar = TCH-2026-001, Anil Verma = TCH-2026-003, Priya Sharma =
// TCH-2026-002) — kept only where they don't collide with the new
// "one class teacher per section per session" rule.
export const SEED_SECTIONS = [
  // Nursery, 2026-27
  { sectionKey: 's27', classKey: 'c14', name: 'A', academicSession: '2026-27', room: 'N-1', capacity: 20, boys: 10, girls: 9, status: 'Active' },
  { sectionKey: 's28', classKey: 'c14', name: 'B', academicSession: '2026-27', room: 'N-2', capacity: 20, boys: 9, girls: 10, status: 'Active' },

  // Playway, 2026-27
  { sectionKey: 's29', classKey: 'c15', name: 'A', academicSession: '2026-27', room: 'K1-1', capacity: 22, boys: 11, girls: 10, status: 'Active' },
  { sectionKey: 's30', classKey: 'c15', name: 'B', academicSession: '2026-27', room: 'K1-2', capacity: 22, boys: 10, girls: 11, status: 'Active' },

  // LKG, 2026-27
  { sectionKey: 's31', classKey: 'c16', name: 'A', academicSession: '2026-27', room: 'K2-1', capacity: 22, boys: 11, girls: 11, status: 'Active' },
  { sectionKey: 's32', classKey: 'c16', name: 'B', academicSession: '2026-27', room: 'K2-2', capacity: 22, boys: 10, girls: 10, status: 'Active' },

  // UKG, 2026-27
  { sectionKey: 's13', classKey: 'c7', name: 'A', academicSession: '2026-27', room: '001', capacity: 25, boys: 12, girls: 12, status: 'Active' },
  { sectionKey: 's14', classKey: 'c7', name: 'B', academicSession: '2026-27', room: '002', capacity: 25, boys: 11, girls: 13, status: 'Active' },

  // Class 1, 2026-27
  { sectionKey: 's15', classKey: 'c8', name: 'A', academicSession: '2026-27', room: '010', capacity: 30, boys: 15, girls: 14, status: 'Active' },
  { sectionKey: 's16', classKey: 'c8', name: 'B', academicSession: '2026-27', room: '011', capacity: 30, boys: 14, girls: 15, status: 'Active' },

  // Class 2, 2026-27
  { sectionKey: 's17', classKey: 'c9', name: 'A', academicSession: '2026-27', room: '020', capacity: 30, boys: 16, girls: 13, status: 'Active' },
  { sectionKey: 's18', classKey: 'c9', name: 'B', academicSession: '2026-27', room: '021', capacity: 30, boys: 14, girls: 15, status: 'Active' },

  // Class 3, 2026-27 — Inactive class, kept with no sections to demo the empty state

  // Class 4, 2026-27 — no class teachers assigned yet
  { sectionKey: 's11', classKey: 'c5', name: 'A', academicSession: '2026-27', room: '100', capacity: 35, boys: 15, girls: 13, status: 'Active' },
  { sectionKey: 's12', classKey: 'c5', name: 'B', academicSession: '2026-27', room: '101', capacity: 35, boys: 16, girls: 14, status: 'Active' },

  // Class 5, 2026-27 — one section at capacity
  { sectionKey: 's9', classKey: 'c4', name: 'A', academicSession: '2026-27', room: '120', capacity: 40, boys: 21, girls: 19, status: 'Active' },
  { sectionKey: 's10', classKey: 'c4', name: 'B', academicSession: '2026-27', room: '121', capacity: 40, boys: 18, girls: 16, status: 'Active' },

  // Class 6, 2026-27 — one section over capacity
  { sectionKey: 's6', classKey: 'c3', name: 'A', academicSession: '2026-27', room: '150', capacity: 40, boys: 19, girls: 17, status: 'Active' },
  { sectionKey: 's7', classKey: 'c3', name: 'B', academicSession: '2026-27', room: '151', capacity: 38, boys: 16, girls: 14, status: 'Active' },
  { sectionKey: 's8', classKey: 'c3', name: 'C', academicSession: '2026-27', room: '152', capacity: 35, boys: 19, girls: 17, status: 'Active', classTeacherEmployeeId: 'TCH-2026-003' },

  // Class 7, 2026-27
  { sectionKey: 's4', classKey: 'c2', name: 'A', academicSession: '2026-27', room: '210', capacity: 40, boys: 20, girls: 18, status: 'Active' },
  { sectionKey: 's5', classKey: 'c2', name: 'B', academicSession: '2026-27', room: '211', capacity: 40, boys: 21, girls: 19, status: 'Active' },

  // Class 8, 2026-27 — 3 sections, 128 students
  { sectionKey: 's1', classKey: 'c1', name: 'A', academicSession: '2026-27', room: '204', capacity: 45, boys: 22, girls: 20, status: 'Active', classTeacherEmployeeId: 'TCH-2026-001' },
  { sectionKey: 's2', classKey: 'c1', name: 'B', academicSession: '2026-27', room: '205', capacity: 44, boys: 23, girls: 21, status: 'Active' },
  { sectionKey: 's3', classKey: 'c1', name: 'C', academicSession: '2026-27', room: '206', capacity: 44, boys: 21, girls: 21, status: 'Active' },

  // Class 9, 2026-27
  { sectionKey: 's19', classKey: 'c10', name: 'A', academicSession: '2026-27', room: '300', capacity: 40, boys: 19, girls: 18, status: 'Active', classTeacherEmployeeId: 'TCH-2026-002' },
  { sectionKey: 's20', classKey: 'c10', name: 'B', academicSession: '2026-27', room: '301', capacity: 40, boys: 18, girls: 17, status: 'Active' },

  // Class 10, 2026-27
  { sectionKey: 's21', classKey: 'c11', name: 'A', academicSession: '2026-27', room: '310', capacity: 40, boys: 20, girls: 19, status: 'Active' },
  { sectionKey: 's22', classKey: 'c11', name: 'B', academicSession: '2026-27', room: '311', capacity: 40, boys: 19, girls: 17, status: 'Active' },

  // Class 11, 2026-27
  { sectionKey: 's23', classKey: 'c12', name: 'A', academicSession: '2026-27', room: '320', capacity: 35, boys: 16, girls: 14, status: 'Active' },
  { sectionKey: 's24', classKey: 'c12', name: 'B', academicSession: '2026-27', room: '321', capacity: 35, boys: 15, girls: 13, status: 'Active' },

  // Class 12, 2026-27
  { sectionKey: 's25', classKey: 'c13', name: 'A', academicSession: '2026-27', room: '330', capacity: 35, boys: 17, girls: 15, status: 'Active' },
  { sectionKey: 's26', classKey: 'c13', name: 'B', academicSession: '2026-27', room: '331', capacity: 35, boys: 15, girls: 14, status: 'Active' },

  // Class 8 & 7, 2025-26 — previous session data
  { sectionKey: 'sp1', classKey: 'c1p', name: 'A', academicSession: '2025-26', room: '204', capacity: 40, boys: 20, girls: 19, status: 'Active' },
  { sectionKey: 'sp2', classKey: 'c1p', name: 'B', academicSession: '2025-26', room: '205', capacity: 40, boys: 18, girls: 17, status: 'Active' },
  { sectionKey: 'sp3', classKey: 'c2p', name: 'A', academicSession: '2025-26', room: '210', capacity: 38, boys: 17, girls: 15, status: 'Active' },
];
