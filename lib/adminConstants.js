// Client-safe constants split out of lib/admins.js — that file now imports
// the Prisma client (server-only), so components that need just these plain
// values (e.g. rendering the permissions list in a modal) must import them
// from here instead, or their client bundle would try to pull in Prisma.
export const ADMIN_STATUSES = ['Active', 'Inactive'];

export const ADMIN_PERMISSIONS = [
  { key: 'manageStudents', label: 'Manage Students', description: 'Add, edit and deactivate student records.' },
  { key: 'manageTeachers', label: 'Manage Teachers', description: 'Add, edit and deactivate teacher records.' },
  { key: 'manageClasses', label: 'Manage Classes & Sections', description: 'Create classes, sections and assign class teachers.' },
  { key: 'manageAcademicSessions', label: 'Manage Academic Sessions', description: 'Create sessions and set the active one.' },
  { key: 'manageSchoolSettings', label: 'Manage School Settings', description: 'Edit profile, contact, branding and preferences.' },
];

export function defaultPermissions(overrides = {}) {
  return ADMIN_PERMISSIONS.reduce((acc, { key }) => ({ ...acc, [key]: true, ...overrides }), {});
}
