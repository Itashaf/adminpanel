import { redirect } from 'next/navigation';
import { getCurrentUser } from './currentUser';
import { getCurrentUserInfo } from './iam';

// Server-side gate for any page/layout a Teacher must never manage (creating,
// editing, deleting anything; the Teachers/Classes/Sessions/Settings modules
// entirely). Call at the top of the route before fetching or rendering
// anything else — a Teacher hitting the URL directly gets redirected to their
// own workspace instead of seeing the page, closing the gap a hidden Sidebar
// link alone wouldn't (someone can always type a URL).
//
// A real signed-in session must win over lib/currentUser.js's process-wide
// demo toggle here too — same fix as app/dashboard/marks-entry/page.jsx and
// app/dashboard/exams/list/page.jsx. Without this, the toggle being left on
// 'SchoolAdmin' (or any other Teacher) by unrelated activity elsewhere on
// this server would let a real Teacher's own session sail straight through
// this guard onto an admin-only page.
export async function blockIfTeacher(redirectTo = '/dashboard/attendance/daily') {
  const user = (await getCurrentUserInfo()) || (await getCurrentUser());
  if (user.role === 'Teacher') {
    redirect(redirectTo);
  }
  return user;
}

// Same closing-the-URL-gap reasoning as blockIfTeacher, for Academics
// (Classes & Sections, Subjects, Time Table, Calendar, Academic Sessions)
// and Homework — Accountant's sidebar never links to these (Sidebar.jsx),
// but typing the URL directly used to sail straight through every one of
// them since they only ever checked blockIfTeacher, which an admin-tier
// coarse `role: 'SchoolAdmin'` tag (Principal/Accountant/Admin alike)
// always passes. Checks the real `roleKey` (lib/iam.js), not that coarse
// tag, since Accountant's whole point is being admin-tier for everything
// EXCEPT this.
export async function blockIfAccountant(redirectTo = '/dashboard/fees/students') {
  const user = (await getCurrentUserInfo()) || (await getCurrentUser());
  if (user.roleKey === 'Accountant') {
    redirect(redirectTo);
  }
  return user;
}

// Page guard for admin-only areas (Teachers, Settings, Promote): sends a Teacher
// or an Accountant back to the dashboard. The sidebar already hides these links,
// but a hidden link does not stop someone typing the URL, and these pages fetch
// their data straight from lib/ (no API permission check in between).
export async function blockIfNotAdminTier(redirectTo = '/dashboard') {
  const user = (await getCurrentUserInfo()) || (await getCurrentUser());
  if (user.role === 'Teacher' || user.roleKey === 'Accountant') {
    redirect(redirectTo);
  }
  return user;
}

// A school's Admin or Principal (the legacy SchoolAdmin tag) or the Super Admin.
// Parent and Accountant are NOT admin-tier even though they are "not a Teacher" —
// code that used to treat every non-Teacher as an admin let both of them write
// homework and marks (SEC-001).
export function isAdminTier(actor) {
  if (!actor) return false;
  if (actor.role === 'SuperAdmin') return true;
  return actor.role === 'SchoolAdmin' && actor.roleKey !== 'Accountant';
}

// A Teacher may only ever view a student who is in one of their own
// class+section assignments (for the student's own academic session) — used
// by the Students list (to filter) and the Student profile page (to 404
// anyone else's student instead of rendering it read-only).
export function isStudentInTeacherScope(student, assignedClasses) {
  return (assignedClasses || []).some(
    (a) => a.class === student.class && a.section === student.section && a.academicSession === student.academicSession
  );
}

// A Teacher's full class scope: their own subject assignments PLUS every
// class+section they're the Class Teacher of (Section.classTeacherId) — two
// independent ways a Teacher is tied to a class (see lib/examSchedules.js's
// getClassTeacherScopeForExam for the same split). Used everywhere a Teacher
// needs access beyond just what they teach — Attendance, Students, and so
// on — kept per-section: being Class Teacher of 5-A only grants 5-A, never
// 5-B too (unlike an exam's shared date sheet, which is whole-class).
export function getTeacherClassScope(currentUser) {
  const assigned = currentUser.assignedClasses || [];
  const classTeacherOf = (currentUser.classTeacherOf || []).map((s) => ({
    academicSession: s.academicSession,
    class: s.class,
    section: s.section,
  }));
  return [...assigned, ...classTeacherOf];
}

// A generalized version of the same check for a *submitted* class/section
// combination rather than an existing student record — used by Notices and
// Homework to reject a Teacher trying to create/edit something outside their
// own assignments. `sectionName` is optional: pass it (Homework, always
// section-specific) for an exact class+section match, or omit it (Notices
// targeting "the whole class", not one section) to match on class alone —
// true if the teacher is assigned to *any* section of that class.
export function isClassInTeacherScope(assignedClasses, academicSession, className, sectionName) {
  return (assignedClasses || []).some(
    (a) => a.academicSession === academicSession && a.class === className && (!sectionName || a.section === sectionName)
  );
}
