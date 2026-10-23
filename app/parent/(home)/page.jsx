import { redirect } from 'next/navigation';
import { getCurrentUserInfo } from '@/lib/iam';
import { getStudentById } from '@/lib/students';
import { getStudentFees } from '@/lib/fees';
import { getStudentAttendanceStats } from '@/lib/attendance';
import { getNoticesSummaryForStudent } from '@/lib/notices';
import { getHomeworkSummaryForStudent } from '@/lib/homework';
import { getExamSummaryForStudent } from '@/lib/exams';
import { getCalendarEventsForStudent } from '@/lib/calendarEvents';
import ParentDashboardView from '@/components/parent/ParentDashboardView';
import { todayInSchoolTz } from '@/lib/schoolToday';

export const metadata = {
  title: 'Dashboard | SchoolApp 360 Parent Portal',
};

// The Parent Portal's landing page — a quick summary of every section so a
// parent doesn't have to open each page just to see if anything needs
// attention. Each section's own page (app/parent/fees, /attendance, etc.)
// still owns the full, real view — this only asks the database for each
// section's count and newest few items, never the whole list.
export default async function ParentDashboardPage() {
  const actor = await getCurrentUserInfo();
  if (!actor || actor.role !== 'Parent') redirect('/login');

  const student = await getStudentById(actor.studentId, actor.schoolId);
  if (!student) redirect('/login');

  const [fees, attendance, noticeSummary, homeworkSummary, examSummary, events] = await Promise.all([
    getStudentFees(student.id, student.academicSession),
    getStudentAttendanceStats(student.id, {}),
    getNoticesSummaryForStudent(student, actor.id, { latest: 3 }),
    getHomeworkSummaryForStudent(student, { latest: 3 }),
    getExamSummaryForStudent(student),
    getCalendarEventsForStudent(actor.schoolId, student),
  ]);

  const totalDue = fees.reduce((sum, fee) => sum + Math.max(fee.payableAmount - fee.paidAmount, 0), 0);

  const today = todayInSchoolTz();
  const upcomingEvents = events
    .filter((e) => (e.endDate || e.startDate) >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 3);

  return (
    <ParentDashboardView
      parentName={actor.name}
      student={student}
      students={actor.students || []}
      activeStudentId={actor.studentId}
      totalDue={totalDue}
      attendancePercent={attendance?.percent ?? null}
      attendancePresent={attendance?.Present ?? 0}
      attendanceTotal={attendance?.total ?? 0}
      homeworkCount={homeworkSummary.count}
      recentHomework={homeworkSummary.latest}
      upcomingExamsCount={examSummary.upcomingCount}
      nextExam={examSummary.nextExam}
      recentNotices={noticeSummary.latest}
      upcomingEvents={upcomingEvents}
    />
  );
}
