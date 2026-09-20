import DashboardShell from '@/components/dashboard/DashboardShell';
import { getSchoolSettings } from '@/lib/schoolSettings';
import { getActiveSession, getAllSessions } from '@/lib/academicSessions';
import { getCurrentUser } from '@/lib/currentUser';
import { getCurrentUserInfo } from '@/lib/iam';
import { resolveSchoolId } from '@/lib/auth/schoolContext';
import { getAllLeaveRequests } from '@/lib/teacherLeaves';

export default async function DashboardLayout({ children }) {
  const [school, activeSession, sessions, currentUser, userInfo] = await Promise.all([
    getSchoolSettings(),
    getActiveSession(),
    getAllSessions(),
    getCurrentUser(),
    getCurrentUserInfo(),
  ]);

  // Sidebar badge on "Leave Requests" — an Admin's only real-time signal for
  // a new request, since (unlike Teacher/Parent) SchoolAdmin has no mobile
  // app and no registered push tokens (see lib/pushTokens.js) to send a push
  // to at all.
  let pendingLeaveCount = 0;
  if (currentUser.role !== 'Teacher') {
    const schoolId = await resolveSchoolId();
    const pending = await getAllLeaveRequests(schoolId, 'Pending');
    pendingLeaveCount = pending.length;
  }

  return (
    <DashboardShell
      school={school}
      activeSession={activeSession}
      sessions={sessions}
      currentUser={currentUser}
      userInfo={userInfo}
      pendingLeaveCount={pendingLeaveCount}
    >
      {children}
    </DashboardShell>
  );
}
