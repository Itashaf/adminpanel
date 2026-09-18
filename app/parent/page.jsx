import { redirect } from 'next/navigation';
import { getCurrentUserInfo } from '@/lib/iam';
import { getStudentById } from '@/lib/students';
import { getStudentFees } from '@/lib/fees';
import { getStudentAttendanceStats } from '@/lib/attendance';
import { getNoticesForStudent } from '@/lib/notices';
import { getHomeworkForStudent } from '@/lib/homework';
import ParentDashboardView from '@/components/parent/ParentDashboardView';

export const metadata = {
  title: 'Dashboard | SchoolApp 360 Parent Portal',
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// The Parent Portal's landing page — one-click links to every section
// (Fees/Attendance/Notices/Homework/Profile) plus a quick summary of each,
// so a parent doesn't have to open every page just to see if anything needs
// attention. Each section's own page (app/parent/fees, /attendance, etc.)
// still owns the full, real view — this only ever shows small derived
// numbers/previews from the same data those pages already fetch.
export default async function ParentDashboardPage() {
  const actor = await getCurrentUserInfo();
  if (!actor || actor.role !== 'Parent') redirect('/login');

  const student = await getStudentById(actor.studentId, actor.schoolId);
  if (!student) redirect('/login');

  const [fees, attendance, notices, homework] = await Promise.all([
    getStudentFees(student.id, student.academicSession),
    getStudentAttendanceStats(student.id, {}),
    getNoticesForStudent(student),
    getHomeworkForStudent(student),
  ]);

  const totalDue = fees.reduce((sum, fee) => sum + Math.max(fee.payableAmount - fee.paidAmount, 0), 0);
  const today = todayStr();
  const todayStatus = attendance?.days?.find((d) => d.date === today)?.status ?? null;

  return (
    <ParentDashboardView
      student={student}
      totalDue={totalDue}
      attendancePercent={attendance?.percent ?? null}
      attendancePresent={attendance?.Present ?? 0}
      attendanceTotal={attendance?.total ?? 0}
      todayStatus={todayStatus}
      noticesCount={notices.length}
      recentNotices={notices.slice(0, 3)}
      homeworkCount={homework.length}
      // getHomeworkForStudent comes back newest-first (see
      // lib/homework.js's getAllHomework), so this is just the latest 3.
      recentHomework={homework.slice(0, 3)}
    />
  );
}
