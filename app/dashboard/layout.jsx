import DashboardShell from '@/components/dashboard/DashboardShell';
import { getSchoolSettings } from '@/lib/schoolSettings';
import { getActiveSession, getAllSessions } from '@/lib/academicSessions';
import { getCurrentUser } from '@/lib/currentUser';
import { getCurrentUserInfo } from '@/lib/iam';

export default async function DashboardLayout({ children }) {
  const [school, activeSession, sessions, currentUser, userInfo] = await Promise.all([
    getSchoolSettings(),
    getActiveSession(),
    getAllSessions(),
    getCurrentUser(),
    getCurrentUserInfo(),
  ]);

  return (
    <DashboardShell school={school} activeSession={activeSession} sessions={sessions} currentUser={currentUser} userInfo={userInfo}>
      {children}
    </DashboardShell>
  );
}
