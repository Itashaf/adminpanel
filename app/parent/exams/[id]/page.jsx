import { notFound, redirect } from 'next/navigation';
import ParentExamDetailView from '@/components/parent/ParentExamDetailView';
import { getCurrentUserInfo } from '@/lib/iam';
import { getStudentById } from '@/lib/students';
import { getExamById } from '@/lib/exams';
import { getExamResultForStudent } from '@/lib/examResults';
import { getSchoolSettings } from '@/lib/schoolSettings';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const exam = await getExamById(id);
  return { title: exam ? `${exam.name} | SchoolApp 360 Parent Portal` : 'Exam | SchoolApp 360 Parent Portal' };
}

export default async function ParentExamDetailPage({ params }) {
  const { id } = await params;
  const actor = await getCurrentUserInfo();
  if (!actor || actor.role !== 'Parent') redirect('/login');
  const student = await getStudentById(actor.studentId, actor.schoolId);
  if (!student) redirect('/login');

  const exam = await getExamById(id);
  // getExamById itself doesn't scope by class (it's shared with the Admin
  // detail page) — a parent must only ever see an exam that actually
  // applies to their own child's class and session, not any exam id in the
  // school they happen to guess.
  if (!exam || exam.status === 'Draft' || !exam.classes.includes(student.class) || exam.academicSession !== student.academicSession) {
    notFound();
  }

  const schedules = exam.schedules.filter(
    (s) => s.className === student.class && (!s.sectionName || s.sectionName === student.section)
  );

  const [result, school] = await Promise.all([getExamResultForStudent(id, student.id), getSchoolSettings()]);

  return <ParentExamDetailView exam={exam} schedules={schedules} result={result} student={student} school={school} />;
}
