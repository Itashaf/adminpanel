import { redirect } from 'next/navigation';
import { getCurrentUserInfo } from '@/lib/iam';
import { getStudentById } from '@/lib/students';
import { getCalendarEventsForStudent } from '@/lib/calendarEvents';
import ParentCalendarView from '@/components/parent/ParentCalendarView';

export const metadata = {
  title: 'Calendar | SchoolApp 360 Parent Portal',
};

export default async function ParentCalendarPage() {
  const actor = await getCurrentUserInfo();
  if (!actor || actor.role !== 'Parent') redirect('/login');

  const student = await getStudentById(actor.studentId, actor.schoolId);
  if (!student) redirect('/login');

  const events = await getCalendarEventsForStudent(actor.schoolId, student);

  return <ParentCalendarView events={events} student={student} />;
}
