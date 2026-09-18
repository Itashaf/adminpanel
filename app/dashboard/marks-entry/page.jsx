import MarksEntryClient from '@/components/marksEntry/MarksEntryClient';
import { getVisibleExams } from '@/lib/exams';
import { getCurrentUser } from '@/lib/currentUser';
import { getCurrentUserInfo } from '@/lib/iam';

export const metadata = {
  title: 'Marks Entry | SchoolApp 360',
};

export default async function MarksEntryPage() {
  // A real signed-in session (SchoolAdmin/Teacher via the actual login form)
  // must always win over lib/currentUser.js's demo dashboard-role toggle —
  // that toggle is a single process-wide flag, not per-session, so whichever
  // Teacher logged in most recently anywhere on this server would otherwise
  // silently scope every real Admin's exam list down to that teacher's own
  // classes. Only fall back to the toggle when there's no real session.
  const currentUser = (await getCurrentUserInfo()) || (await getCurrentUser());
  const exams = await getVisibleExams(currentUser);
  // Marks can only be entered once an exam's date sheet is actually out —
  // a Draft exam's schedule is still being configured by the admin.
  const enterableExams = exams.filter((exam) => exam.status !== 'Draft');

  return <MarksEntryClient exams={enterableExams} role={currentUser.role} />;
}
