import NoticesExplorer from '@/components/notices/NoticesExplorer';
import { getNoticesPageForUser, getParentAccountOptions } from '@/lib/notices';
import { getAllSessions, getActiveSession } from '@/lib/academicSessions';
import { getCurrentUser } from '@/lib/currentUser';
import { getCurrentUserInfo } from '@/lib/iam';
import { getAllTeachers } from '@/lib/teachers';
import { resolveSchoolId } from '@/lib/auth/schoolContext';

export const metadata = {
  title: 'Notices | SchoolApp 360',
};

const PAGE_SIZE = 10;

export default async function NoticesPage({ searchParams }) {
  const params = await searchParams;
  // Real session first — see app/dashboard/homework/page.jsx's identical
  // fix: the dashboard-toggle fallback never carries classTeacherOf, which
  // left a Class-Teacher-only teacher (no subject assignments) seeing no
  // notices for their own homeroom.
  const currentUser = (await getCurrentUserInfo()) || (await getCurrentUser());
  const isTeacher = currentUser.role === 'Teacher';
  const schoolId = await resolveSchoolId();

  // Teacher/Parent option lists are only ever needed for the "Individual"
  // recipient picker, which only Admin-tier can post — skip the extra
  // queries entirely for a Teacher session.
  // Filters/page live in the URL (see NoticesExplorer's useUrlSync) so a
  // refresh or router.refresh() after a save lands on the same view. Only that
  // one page is fetched here; later pages/filters come from /api/notices/page.
  const initialParams = {
    search: params?.search || '',
    audience: params?.audience || '',
    className: params?.className || '',
    priority: params?.priority || '',
    page: Math.max(Number(params?.page) || 1, 1),
  };

  const [initialResult, sessions, activeSession, teachers, parentOptions] = await Promise.all([
    getNoticesPageForUser(currentUser, { ...initialParams, pageSize: PAGE_SIZE }),
    getAllSessions(),
    getActiveSession(),
    isTeacher ? Promise.resolve([]) : getAllTeachers(schoolId),
    isTeacher ? Promise.resolve([]) : getParentAccountOptions(),
  ]);

  return (
    <NoticesExplorer
      initialResult={initialResult}
      initialParams={initialParams}
      pageSize={PAGE_SIZE}
      sessionOptions={sessions.map((s) => ({ value: s.name, label: s.name }))}
      defaultSession={activeSession?.name || sessions[0]?.name || ''}
      currentUser={currentUser}
      teacherOptions={teachers.map((t) => ({ value: t.id, label: `${t.firstName} ${t.lastName}` }))}
      parentOptions={parentOptions.map((p) => ({ value: p.id, label: p.name }))}
    />
  );
}
