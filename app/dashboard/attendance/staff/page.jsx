import { blockIfTeacher } from '@/lib/roleGuard';
import { getTeacherAttendanceForDate } from '@/lib/teacherAttendance';
import { resolveSchoolId } from '@/lib/auth/schoolContext';
import { toLocalDateStr } from '@/lib/attendance';
import StaffAttendanceBoard from '@/components/staffAttendance/StaffAttendanceBoard';

export const metadata = {
  title: 'Staff Attendance | SchoolApp 360',
};

// Admin-only — a Teacher never marks their own or a colleague's attendance
// (see blockIfTeacher's own doc comment for why the redirect, not just a
// hidden Sidebar link, matters).
export default async function StaffAttendancePage() {
  await blockIfTeacher();

  const schoolId = await resolveSchoolId();
  const today = toLocalDateStr(new Date());
  const initialData = await getTeacherAttendanceForDate(schoolId, today);

  return <StaffAttendanceBoard initialDate={today} initialData={initialData} />;
}
