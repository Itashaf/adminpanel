import DailyAttendanceBoard from '@/components/attendance/DailyAttendanceBoard';
import { getAllSessions } from '@/lib/academicSessions';
import { getCurrentUser } from '@/lib/currentUser';
import { getCurrentUserInfo } from '@/lib/iam';
import { getClassSectionsMap } from '@/lib/classes';
import { toLocalDateStr } from '@/lib/attendance';

export const metadata = {
  title: 'Daily Attendance | SchoolApp 360',
};

export default async function DailyAttendancePage() {
  // A real signed-in session must win over lib/currentUser.js's demo toggle
  // — same fix as marks-entry/exams; it's also the only source that carries
  // classTeacherOf (see lib/iam.js), which a Teacher needs to see a class
  // they're the Class Teacher of but have no subject assignment in.
  const [sessions, currentUser, classSections] = await Promise.all([
    getAllSessions(),
    (async () => (await getCurrentUserInfo()) || (await getCurrentUser()))(),
    getClassSectionsMap(),
  ]);
  const activeSession = sessions.find((s) => s.status === 'Active') || sessions[0];
  const today = toLocalDateStr(new Date());

  // Class Teacher scope only (currentUser.classTeacherOf) — a Teacher only
  // marks attendance for a class they're actually the Class Teacher of, not
  // one they merely teach a subject in.
  const teacherScope = currentUser.role === 'Teacher' ? currentUser.classTeacherOf || [] : [];
  const classOptions =
    currentUser.role === 'Teacher'
      ? [...new Set(teacherScope.map((a) => a.class))].map((c) => ({ value: c, label: c }))
      : Object.keys(classSections).map((c) => ({ value: c, label: c }));

  return (
    <DailyAttendanceBoard
      initialSession={activeSession?.name || sessions[0]?.name || ''}
      initialDate={today}
      classOptions={classOptions}
      currentUser={currentUser.role === 'Teacher' ? { ...currentUser, assignedClasses: teacherScope } : currentUser}
    />
  );
}
