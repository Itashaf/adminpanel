import { getTeacherById } from './teachers';
import { getSession } from './auth/session';

export const ROLES = ['SchoolAdmin', 'Teacher'];

// The dashboard's "which view am I" answer, derived from the REQUEST'S OWN
// session on every call. It used to be a single process-wide flag flipped at
// login, which meant whichever person logged in last decided what every other
// signed-in user (and every request without a session) saw: a Teacher logging
// in made an Admin's sidebar and pages switch to the Teacher view, and the
// other way round. Nothing is stored between requests any more.
//
// SchoolAdmin sees every class; a Teacher is scoped to their own real teacher
// record, whose assignments drive the Attendance module's class/section
// pickers, reports, and the "Mark Attendance" permission checks. Anyone else
// (SchoolAdmin, Principal/Accountant, SuperAdmin) gets the admin shape.
export async function getCurrentUser() {
  let session = null;
  try {
    session = await getSession();
  } catch {
    // No request context (a script) — nobody is signed in, admin shape below.
  }

  if (session?.role !== 'Teacher' || !session.schoolId) {
    return { role: 'SchoolAdmin', name: 'Admin', assignedClasses: null };
  }

  const teacher = await getTeacherById(session.id, session.schoolId);
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
