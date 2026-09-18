import { getAllTeachers } from './teachers';
import { resolveSchoolId } from './auth/schoolContext';

export const ROLES = ['SchoolAdmin', 'Teacher'];

// Demo stand-in for a real auth/session layer: which role is "logged in" is
// a single globalThis-cached flag flipped at /login (see LoginForm.jsx), not
// a per-request session. SchoolAdmin sees every class; Teacher is scoped to
// whichever specific teacher actually signed in (see setCurrentRole below) —
// their own assignments drive the Attendance module's class/section pickers,
// reports, and the "Mark Attendance" permission checks.
const CURRENT_USER = globalThis.__CURRENT_USER__ ?? (globalThis.__CURRENT_USER__ = { role: 'SchoolAdmin', teacherId: null });

export async function getCurrentUser() {
  if (CURRENT_USER.role !== 'Teacher') {
    return { role: 'SchoolAdmin', name: 'Admin', assignedClasses: null };
  }

  const schoolId = await resolveSchoolId();
  const teachers = await getAllTeachers(schoolId);
  const teacher = teachers.find((t) => t.id === CURRENT_USER.teacherId) || teachers[0];
  const assignedClasses = (teacher?.assignments || [])
    .filter((a) => a.status === 'Active')
    .map((a) => ({ academicSession: a.academicSession, class: a.class, section: a.section, subject: a.subject || '' }));

  return {
    role: 'Teacher',
    name: teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Teacher',
    teacherId: teacher?.id || null,
    assignedClasses,
  };
}

// `teacherId` should always be supplied by a real teacher-login flow
// (app/actions/auth.js's teacherLoginAction). It's optional only so
// setCurrentRoleAction (the plain SchoolAdmin/Teacher toggle, no
// credentials) still falls back to a sensible default teacher instead of
// crashing.
export async function setCurrentRole(role, teacherId = null) {
  if (role === 'Teacher') {
    let resolvedId = teacherId;
    if (!resolvedId) {
      const schoolId = await resolveSchoolId();
      const teachers = await getAllTeachers(schoolId);
      resolvedId = teachers.find((t) => t.assignments?.some((a) => a.status === 'Active'))?.id || teachers[0]?.id || null;
    }
    Object.assign(CURRENT_USER, { role: 'Teacher', teacherId: resolvedId });
  } else {
    Object.assign(CURRENT_USER, { role: 'SchoolAdmin', teacherId: null });
  }
  return { ...CURRENT_USER };
}
