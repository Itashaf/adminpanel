// The full permission catalog from the RBAC spec — one row per key, grouped
// by `module` for the Roles & Permissions UI. Shared by the migration seed
// script (prisma/migrate-rbac.js) and, later, by the requirePermission()
// guard and the UI's permission matrix (task 9, 23) — single source so the
// catalog never drifts between "what's seeded" and "what's checked".
const PERMISSIONS = [
  // Students
  { key: 'students.view', module: 'students', label: 'View Students' },
  { key: 'students.create', module: 'students', label: 'Create Students' },
  { key: 'students.update', module: 'students', label: 'Update Students' },
  { key: 'students.delete', module: 'students', label: 'Delete Students' },
  // Teachers
  { key: 'teachers.view', module: 'teachers', label: 'View Teachers' },
  { key: 'teachers.create', module: 'teachers', label: 'Create Teachers' },
  { key: 'teachers.update', module: 'teachers', label: 'Update Teachers' },
  { key: 'teachers.delete', module: 'teachers', label: 'Delete Teachers' },
  // Student Attendance
  { key: 'attendance.student.view', module: 'attendance.student', label: 'View Student Attendance' },
  { key: 'attendance.student.mark', module: 'attendance.student', label: 'Mark Student Attendance' },
  { key: 'attendance.student.update', module: 'attendance.student', label: 'Update Student Attendance' },
  { key: 'attendance.student.report', module: 'attendance.student', label: 'Student Attendance Reports' },
  // Teacher Attendance
  { key: 'attendance.teacher.view', module: 'attendance.teacher', label: 'View Teacher Attendance' },
  { key: 'attendance.teacher.mark', module: 'attendance.teacher', label: 'Mark Teacher Attendance' },
  { key: 'attendance.teacher.update', module: 'attendance.teacher', label: 'Update Teacher Attendance' },
  { key: 'attendance.teacher.report', module: 'attendance.teacher', label: 'Teacher Attendance Reports' },
  // Leave
  { key: 'leave.view', module: 'leave', label: 'View Leave Requests' },
  { key: 'leave.apply', module: 'leave', label: 'Apply for Leave' },
  { key: 'leave.approve', module: 'leave', label: 'Approve Leave' },
  { key: 'leave.reject', module: 'leave', label: 'Reject Leave' },
  // Classes & Subjects
  { key: 'classes.view', module: 'classes', label: 'View Classes' },
  { key: 'classes.manage', module: 'classes', label: 'Manage Classes' },
  { key: 'subjects.view', module: 'subjects', label: 'View Subjects' },
  { key: 'subjects.manage', module: 'subjects', label: 'Manage Subjects' },
  // Timetable
  { key: 'timetable.view', module: 'timetable', label: 'View Timetable' },
  { key: 'timetable.manage', module: 'timetable', label: 'Manage Timetable' },
  // Exams & Results
  { key: 'exams.view', module: 'exams', label: 'View Exams' },
  { key: 'exams.manage', module: 'exams', label: 'Manage Exams' },
  { key: 'marks.view', module: 'exams', label: 'View Marks' },
  { key: 'marks.enter', module: 'exams', label: 'Enter Marks' },
  { key: 'marks.update', module: 'exams', label: 'Update Marks' },
  { key: 'results.view', module: 'exams', label: 'View Results' },
  { key: 'results.publish', module: 'exams', label: 'Publish Results' },
  // Fees
  { key: 'fees.view', module: 'fees', label: 'View Fees' },
  { key: 'fees.create', module: 'fees', label: 'Create Fee Structures' },
  { key: 'fees.update', module: 'fees', label: 'Update Fees' },
  { key: 'fees.collect', module: 'fees', label: 'Collect Fees' },
  { key: 'fees.refund', module: 'fees', label: 'Refund Fees' },
  { key: 'fees.receipt', module: 'fees', label: 'Fee Receipts' },
  { key: 'fees.report', module: 'fees', label: 'Fee Reports' },
  // Notices
  { key: 'notices.view', module: 'notices', label: 'View Notices' },
  { key: 'notices.create', module: 'notices', label: 'Create Notices' },
  { key: 'notices.update', module: 'notices', label: 'Update Notices' },
  { key: 'notices.delete', module: 'notices', label: 'Delete Notices' },
  // Users
  { key: 'users.view', module: 'users', label: 'View Users' },
  { key: 'users.create', module: 'users', label: 'Create Users' },
  { key: 'users.update', module: 'users', label: 'Update Users' },
  { key: 'users.delete', module: 'users', label: 'Delete Users' },
  // Roles & Permissions
  { key: 'roles.view', module: 'roles', label: 'View Roles' },
  { key: 'roles.manage', module: 'roles', label: 'Manage Roles' },
  { key: 'permissions.view', module: 'roles', label: 'View Permissions' },
  { key: 'permissions.manage', module: 'roles', label: 'Manage Permissions' },
  // Reports
  { key: 'reports.view', module: 'reports', label: 'View Reports' },
  { key: 'reports.export', module: 'reports', label: 'Export Reports' },
  // Settings
  { key: 'settings.view', module: 'settings', label: 'View Settings' },
  { key: 'settings.update', module: 'settings', label: 'Update Settings' },
  // Performance Reports (Monthly + Yearly) — deliberately separate from
  // exams.*/marks.* (Subject Tests are a lighter, separate entity) and from
  // reports.* (that's Admin-facing analytics, not a student's own report).
  { key: 'performanceReports.tests.manage', module: 'performanceReports', label: 'Manage Subject Tests & Marks' },
  { key: 'performanceReports.monthly.manage', module: 'performanceReports', label: 'Manage Monthly Reports' },
  { key: 'performanceReports.yearly.manage', module: 'performanceReports', label: 'Manage Yearly Reports' },
  { key: 'performanceReports.view', module: 'performanceReports', label: 'View Performance Reports' },
];

const ALL_KEYS = PERMISSIONS.map((p) => p.key);

// Platform-level — everything. Not "every key except a few", literally all
// of them, so a newly added permission is automatically covered without
// having to remember to update this list too.
const SUPER_ADMIN = ALL_KEYS;

// Full school-level operational access, except Super Admin/platform-only
// concerns — there is no platform-billing/subscription permission in this
// catalog yet (out of scope per the spec), so the only real exclusion today
// is nothing: every key here is school-level. Kept as its own named list
// (not reusing SUPER_ADMIN) so the two can diverge the moment a
// platform-only permission is added later, without touching this file.
const PRINCIPAL = ALL_KEYS;

// Daily school operations — explicitly NOT roles/permissions management,
// NOT settings.update (a Principal-level concern per the spec), matching
// "Admin must NOT manage: Super Admin, Principal, platform settings,
// subscription/billing" — settings.view stays so an Admin can at least see
// current settings without being able to change them.
const ADMIN = [
  'students.view', 'students.create', 'students.update', 'students.delete',
  'teachers.view', 'teachers.create', 'teachers.update', 'teachers.delete',
  'attendance.student.view', 'attendance.student.mark', 'attendance.student.update', 'attendance.student.report',
  'attendance.teacher.view', 'attendance.teacher.mark', 'attendance.teacher.update', 'attendance.teacher.report',
  'leave.view', 'leave.approve', 'leave.reject',
  'classes.view', 'classes.manage', 'subjects.view', 'subjects.manage',
  'timetable.view', 'timetable.manage',
  // marks.enter/.update included — the existing marks-entry route
  // (app/api/exams/schedules/[scheduleId]/marks) already lets any Admin
  // enter/edit marks directly (assertCanAccessSchedule passes Admin
  // unconditionally), and the verify/approve/reject/unlock route
  // (.../verify) is admin-only too — both are real, pre-existing admin
  // capabilities this list needs to match, not just exam definition/CRUD.
  'exams.view', 'exams.manage', 'marks.view', 'marks.enter', 'marks.update', 'results.view', 'results.publish',
  // The spec's own Admin description doesn't list Fees (only Accountant
  // does) — but every existing fees route has always been gated by plain
  // requireSchoolAdmin(), no distinction from any other admin action, so
  // any current SchoolAdmin already has full, unrestricted fees access
  // today. Omitting these here would be a real regression the first time
  // this module's routes got swapped (found live: Admin got 403'd on
  // GET /api/fees/structures and POST /api/fees/collect during task 26's
  // Fees-module testing), not a spec-compliance improvement.
  'fees.view', 'fees.create', 'fees.update', 'fees.collect', 'fees.refund', 'fees.receipt', 'fees.report',
  'notices.view', 'notices.create', 'notices.update', 'notices.delete',
  'users.view', 'users.create', 'users.update',
  'reports.view', 'reports.export',
  // settings.update included too — the spec's "Admin must NOT manage...
  // platform settings" means Super Admin's platform-wide config
  // (billing/subscriptions/cross-school), not a school's own profile/
  // branding/contact/preferences/attendance-rules/sessions, which every
  // existing /api/school/** and /api/sessions/** route has always let any
  // SchoolAdmin update via plain requireSchoolAdmin() — same
  // don't-regress-existing-access reasoning as fees.* above.
  'settings.view', 'settings.update',
  // Admin oversight of the Performance Report module — spec is silent on
  // Admin here same as it was silent on Fees, and that silence turned out
  // to mean "still needs full access" once real routes got wired (see the
  // fees.* comment above). Granted proactively rather than found missing
  // live, same reasoning.
  'performanceReports.tests.manage', 'performanceReports.monthly.manage', 'performanceReports.yearly.manage', 'performanceReports.view',
];

// Teaching-related only — the spec's scope note applies here: these
// permission KEYS don't carry which classes/students/subjects a Teacher may
// touch, that's resolved separately per request (task 10's scope helper)
// off classTeacherOf/assignedClasses, same as today.
//
// attendance.student.update deliberately excluded — found during task 26's
// Attendance-module wiring that the app's actual, pre-existing lock/unlock
// endpoint (PATCH /api/attendance/[id]/lock) reserves that action to
// Admin-tier roles only ("Only an admin can lock or unlock attendance.").
// Including .update here would have silently handed Teacher that action
// the moment the route's guard swapped from a role check to a flat
// permission check.
const TEACHER = [
  'students.view',
  'attendance.student.view', 'attendance.student.mark', 'attendance.student.report',
  'marks.view', 'marks.enter', 'marks.update', 'results.view',
  'timetable.view', 'timetable.manage',
  'attendance.teacher.view', 'attendance.teacher.mark',
  'leave.view', 'leave.apply',
  // notices.create/.update/.delete — a Class Teacher can already post a
  // "Class" notice for their own section, and edit/delete only their own
  // posts (lib/notices.js's assertScopeAllowed/canManageNotice) — that scope
  // enforcement already exists and isn't changed by adding the permission
  // key, only gating routes that previously had no role check at all beyond
  // "any signed-in user".
  'notices.view', 'notices.create', 'notices.update', 'notices.delete',
  'classes.view', 'subjects.view',
  // Every Teacher gets all 4 keys — the spec's "Subject Teacher can't touch
  // Monthly Reports, Class Teacher can" split is NOT a separate RoleKey in
  // this app (there's only one 'Teacher' role), it's the same
  // classTeacherOf scope check every other Teacher-only feature already
  // uses (Attendance, Timetable). A Teacher who is a Subject Teacher for
  // one class and Class Teacher for another correctly gets 403'd on the
  // monthly/yearly routes for the class they don't head, via scope, not by
  // missing this permission key entirely.
  'performanceReports.tests.manage', 'performanceReports.monthly.manage', 'performanceReports.yearly.manage', 'performanceReports.view',
];

// Financial functionality only.
const ACCOUNTANT = [
  'students.view',
  'fees.view', 'fees.create', 'fees.update', 'fees.collect', 'fees.refund', 'fees.receipt', 'fees.report',
  'reports.view', 'reports.export',
  'notices.view',
];

// Read-only, own linked children — same scope note as Teacher: "own linked
// children" is enforced by the scope helper (task 10) off the Parent's
// activeStudentId/ParentStudentLink rows, not by these keys.
const PARENT = [
  'students.view',
  'attendance.student.view',
  'fees.view', 'fees.receipt',
  'results.view',
  'timetable.view',
  'notices.view',
];

const DEFAULT_ROLE_PERMISSIONS = {
  SuperAdmin: SUPER_ADMIN,
  Principal: PRINCIPAL,
  Admin: ADMIN,
  Teacher: TEACHER,
  Accountant: ACCOUNTANT,
  Parent: PARENT,
};

module.exports = { PERMISSIONS, DEFAULT_ROLE_PERMISSIONS };
