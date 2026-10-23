import { redirect } from 'next/navigation';
import { getCurrentUserInfo } from '@/lib/iam';
import { getSchoolSettings } from '@/lib/schoolSettings';
import ParentShell from '@/components/parent/ParentShell';
import SessionWatcher from '@/components/SessionWatcher';

// Every /parent page is guarded here, once — unlike /dashboard and
// /super-admin (see SKILL.md: "nothing checks schoolapp360_session" there),
// this area genuinely needs it, since the only thing separating one
// family's fee/payment data from another's is this session actually
// resolving to their own child.
export default async function ParentLayout({ children }) {
  const actor = await getCurrentUserInfo();
  if (!actor || actor.role !== 'Parent') {
    // Not signed in as a parent, or the account/school was deactivated: clear the
    // cookie on the way to the login page (see app/api/auth/session-ended).
    redirect('/api/auth/session-ended');
  }

  const school = await getSchoolSettings();

  return (
    <ParentShell school={school} students={actor.students || []} activeStudentId={actor.studentId}>
      <SessionWatcher />
      {children}
    </ParentShell>
  );
}
