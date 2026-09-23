import { notFound } from 'next/navigation';
import { getCurrentUserInfo } from '@/lib/iam';
import { getCurrentUser } from '@/lib/currentUser';
import { getAssessmentForStudent, getAssessmentsForClass } from '@/lib/studentAssessments';
import AssessmentWizard from '@/components/assessments/AssessmentWizard';

export const metadata = {
  title: 'Student Assessment | SchoolApp 360',
};

export default async function AssessmentWizardPage({ params, searchParams }) {
  const { studentId } = await params;
  const query = await searchParams;
  const now = new Date();
  const month = Number(query.month) || now.getMonth() + 1;
  const year = Number(query.year) || now.getFullYear();

  const currentUser = (await getCurrentUserInfo()) || (await getCurrentUser());

  let data;
  try {
    data = await getAssessmentForStudent(studentId, month, year, currentUser);
  } catch (err) {
    // Out-of-scope for this Teacher (not their class) — same "treat like it
    // doesn't exist" convention as every other class-scoped module.
    notFound();
  }
  if (!data) notFound();

  // Same class's roster, same month — lets the wizard offer Previous/Next
  // Student arrows without a second navigation round-trip back to the
  // dashboard. Best-effort: if this fails (shouldn't, same scope check just
  // passed) the wizard simply renders without those arrows.
  let neighbours = { prevStudentId: null, nextStudentId: null };
  try {
    const { roster } = await getAssessmentsForClass(currentUser, {
      className: data.student.className,
      sectionName: data.student.sectionName,
      academicSession: data.student.academicSession,
      month,
      year,
    });
    const index = roster.findIndex((r) => r.studentId === studentId);
    if (index !== -1) {
      neighbours = {
        prevStudentId: roster[index - 1]?.studentId || null,
        nextStudentId: roster[index + 1]?.studentId || null,
      };
    }
  } catch {
    // See comment above.
  }

  const initialStep = Number(query.step) || 0;

  return <AssessmentWizard studentId={studentId} month={month} year={year} data={data} initialStep={initialStep} {...neighbours} />;
}
