import { redirect } from 'next/navigation';
import { getCurrentUserInfo } from '@/lib/iam';
import { getSchoolSettings } from '@/lib/schoolSettings';
import { getStudentById } from '@/lib/students';
import { getNoticesForStudent } from '@/lib/notices';
import ParentShell from '@/components/parent/ParentShell';

// Every /parent page is guarded here, once — unlike /dashboard and
// /super-admin (see SKILL.md: "nothing checks edumanage_session" there),
// this area genuinely needs it, since the only thing separating one
// family's fee/payment data from another's is this session actually
// resolving to their own child.
export default async function ParentLayout({ children }) {
  const actor = await getCurrentUserInfo();
  if (!actor || actor.role !== 'Parent') {
    redirect('/login');
  }

  const student = await getStudentById(actor.studentId, actor.schoolId);
  const [school, notices] = await Promise.all([getSchoolSettings(), student ? getNoticesForStudent(student) : []]);

  return (
    <ParentShell
      school={school}
      students={actor.students || []}
      activeStudentId={actor.studentId}
      noticesCount={notices.length}
    >
      {children}
    </ParentShell>
  );
}
