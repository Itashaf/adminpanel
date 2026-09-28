// Client-safe: pure role-hierarchy data + functions, no server-only
// imports — the Roles & Permissions UI (a Client Component) needs
// canAssignRole()/assignableRoles() to filter the role dropdown by the
// current user's authority; lib/rbac.js re-exports these for server-side
// callers (task 22's route) so there's exactly one copy of the hierarchy.
export const ROLE_KEYS = ['SuperAdmin', 'Principal', 'Admin', 'Teacher', 'Accountant', 'Parent'];

const ASSIGNABLE_BY = {
  SuperAdmin: ['Principal', 'Admin', 'Teacher', 'Accountant', 'Parent'],
  Principal: ['Admin', 'Teacher', 'Accountant', 'Parent'],
  Admin: ['Teacher', 'Accountant', 'Parent'],
  Teacher: [],
  Accountant: [],
  Parent: [],
};

export function canAssignRole(actorRoleKey, targetRoleKey) {
  return (ASSIGNABLE_BY[actorRoleKey] || []).includes(targetRoleKey);
}

export function assignableRoles(actorRoleKey) {
  return ASSIGNABLE_BY[actorRoleKey] || [];
}

// Throws (caller maps to a 403) rather than returning a boolean — every
// server call site is "about to assign a role," never "deciding whether to
// show a UI option," so a throw is the correct default there.
export function assertCanAssignRole(actorRoleKey, targetRoleKey) {
  if (!canAssignRole(actorRoleKey, targetRoleKey)) {
    throw new Error(`${actorRoleKey} cannot assign the ${targetRoleKey} role.`);
  }
}
