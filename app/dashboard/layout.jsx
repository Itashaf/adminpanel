import { redirect } from 'next/navigation';
import DashboardShell from '@/components/dashboard/DashboardShell';
import SessionWatcher from '@/components/SessionWatcher';
import { getSchoolSettings } from '@/lib/schoolSettings';
import { getActiveSession, getAllSessions } from '@/lib/academicSessions';
import { getCurrentUser } from '@/lib/currentUser';
import { getCurrentUserInfo } from '@/lib/iam';
import { getCurrentRBACUser } from '@/lib/rbac';
import { resolveSchoolId } from '@/lib/auth/schoolContext';
import { getPendingLeaveCount } from '@/lib/teacherLeaves';

export default async function DashboardLayout({ children }) {
  // Checked first: the signed-in account (or its school) may have been deactivated
  // after the token was issued, and the lookups below all need a valid session.
  const userInfo = await getCurrentUserInfo();
  if (!userInfo) redirect('/api/auth/session-ended');

  const [school, activeSession, sessions, currentUser, rbacUser] = await Promise.all([
    getSchoolSettings(),
    getActiveSession(),
    getAllSessions(),
    getCurrentUser(),
    getCurrentRBACUser(),
  ]);

  // Sets don't serialize across the Server -> Client Component boundary —
  // spread into a plain array. `null` (no session at all — shouldn't happen
  // behind middleware's own auth check, but a stale token before the login
  // cutover isn't impossible) means Sidebar shows every item unfiltered,
  // same as before this permission-gating existed, rather than hiding
  // everything for someone who's otherwise validly signed in.
  const permissions = rbacUser ? [...rbacUser.permissions] : null;

  // Class Teacher of at least one section — gates the Sidebar's Monthly/
  // Yearly Reports children (see Sidebar.jsx's filterByClassTeacher); a
  // Teacher who only teaches a subject, without owning a homeroom, still
  // gets Subject Tests.
  const isClassTeacher = (userInfo?.classTeacherOf?.length ?? 0) > 0;

  // Sidebar badge on "Leave Requests" — an Admin's only real-time signal for
  // a new request, since (unlike Teacher/Parent) SchoolAdmin has no mobile
  // app and no registered push tokens (see lib/pushTokens.js) to send a push
  // to at all.
  let pendingLeaveCount = 0;
  if (currentUser.role !== 'Teacher') {
    const schoolId = await resolveSchoolId();
    pendingLeaveCount = await getPendingLeaveCount(schoolId);
  }

  return (
    <DashboardShell
      school={school}
      activeSession={activeSession}
      sessions={sessions}
      currentUser={currentUser}
      userInfo={userInfo}
      permissions={permissions}
      roleKey={rbacUser?.roleKey}
      pendingLeaveCount={pendingLeaveCount}
      isClassTeacher={isClassTeacher}
    >
      <SessionWatcher />
      {children}
    </DashboardShell>
  );
}
