import NoticesExplorer from '@/components/notices/NoticesExplorer';
import { getVisibleNotices, getParentAccountOptions } from '@/lib/notices';
import { getAllSessions, getActiveSession } from '@/lib/academicSessions';
import { getCurrentUser } from '@/lib/currentUser';
import { getCurrentUserInfo } from '@/lib/iam';
import { getAllTeachers } from '@/lib/teachers';
import { resolveSchoolId } from '@/lib/auth/schoolContext';

export const metadata = {
  title: 'Notices | SchoolApp 360',
};

export default async function NoticesPage() {
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
  const [notices, sessions, activeSession, teachers, parentOptions] = await Promise.all([
    getVisibleNotices(currentUser),
    getAllSessions(),
    getActiveSession(),
    isTeacher ? Promise.resolve([]) : getAllTeachers(schoolId),
    isTeacher ? Promise.resolve([]) : getParentAccountOptions(),
  ]);

  return (
    <NoticesExplorer
      notices={notices}
      sessionOptions={sessions.map((s) => ({ value: s.name, label: s.name }))}
      defaultSession={activeSession?.name || sessions[0]?.name || ''}
      currentUser={currentUser}
      teacherOptions={teachers.map((t) => ({ value: t.id, label: `${t.firstName} ${t.lastName}` }))}
      parentOptions={parentOptions.map((p) => ({ value: p.id, label: p.name }))}
    />
  );
}
