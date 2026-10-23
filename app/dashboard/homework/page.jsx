import HomeworkExplorer from '@/components/homework/HomeworkExplorer';
import { getHomeworkPageForUser } from '@/lib/homework';
import { getAllSessions, getActiveSession } from '@/lib/academicSessions';
import { getCurrentUser } from '@/lib/currentUser';
import { getCurrentUserInfo } from '@/lib/iam';
import { getTeacherClassScope, blockIfAccountant } from '@/lib/roleGuard';

export const metadata = {
  title: 'Homework | SchoolApp 360',
};

const PAGE_SIZE = 10;

export default async function HomeworkPage({ searchParams }) {
  const params = await searchParams;
  await blockIfAccountant();
  // Real session first — carries classTeacherOf (see lib/iam.js), which a
  // Class Teacher needs even with zero subject assignments of their own.
  // The dashboard-toggle fallback (lib/currentUser.js) never has that field.
  const sessionUser = (await getCurrentUserInfo()) || (await getCurrentUser());
  // HomeworkExplorer's own class picker reads currentUser.assignedClasses
  // directly — replacing it with the merged scope here (instead of only
  // fixing lib/homework.js's internal check) is what makes a Class
  // Teacher's own homeroom actually selectable, not just acceptable once
  // selected.
  const currentUser =
    sessionUser.role === 'Teacher' ? { ...sessionUser, assignedClasses: getTeacherClassScope(sessionUser) } : sessionUser;

  // Filters/sort/page live in the URL (see HomeworkExplorer's useUrlSync) so a
  // refresh or router.refresh() after a save lands on the same view. Only that
  // one page is fetched here; later pages/filters come from /api/homework/page.
  const initialParams = {
    class: params?.class || '',
    section: params?.section || '',
    subject: params?.subject || '',
    q: params?.q || '',
    sort: params?.sort === 'oldest' ? 'oldest' : 'latest',
    page: Math.max(Number(params?.page) || 1, 1),
  };

  const [initialResult, sessions, activeSession] = await Promise.all([
    getHomeworkPageForUser(currentUser, {
      className: initialParams.class,
      section: initialParams.section,
      subject: initialParams.subject,
      search: initialParams.q,
      sort: initialParams.sort,
      page: initialParams.page,
      pageSize: PAGE_SIZE,
    }),
    getAllSessions(),
    getActiveSession(),
  ]);

  return (
    <HomeworkExplorer
      initialResult={initialResult}
      initialParams={initialParams}
      pageSize={PAGE_SIZE}
      sessionOptions={sessions.map((s) => ({ value: s.name, label: s.name }))}
      defaultSession={activeSession?.name || sessions[0]?.name || ''}
      currentUser={currentUser}
    />
  );
}
