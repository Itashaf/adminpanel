// Client-safe: just the flag list + a pure check, no server-only imports —
// SchoolFeaturesCard.jsx (a Client Component) imports FEATURE_FLAGS
// directly, so this file must never pull in next/headers (see
// lib/featureFlagGuard.js for the Server Component guard, which does).
//
// Core modules (Students, Teachers, Attendance, Academics, Settings) are
// never gate-able — a school without them isn't really a functioning
// school. Only the modules below are ones a Super Admin might reasonably
// stage-roll-out or exclude per plan tier.
export const FEATURE_FLAGS = [
  { key: 'fees', label: 'Fees', description: 'Fee structures, collection, and Razorpay online payments.' },
  { key: 'exams', label: 'Exams', description: 'Exam scheduling, marks entry, verification, and results.' },
  { key: 'assessments', label: 'Monthly Assessments', description: 'The Monthly Assessment wizard and reports.' },
  { key: 'homework', label: 'Homework', description: 'Homework assignment and submissions.' },
  { key: 'leave', label: 'Leave Requests', description: 'Teacher leave requests and admin approval.' },
];

export function isFeatureEnabled(disabledFeatures, key) {
  return !(disabledFeatures || []).includes(key);
}
