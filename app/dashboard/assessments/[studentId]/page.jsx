import { notFound } from 'next/navigation';
import { getCurrentUserInfo } from '@/lib/iam';
import { getCurrentUser } from '@/lib/currentUser';
import { getAssessmentForStudent } from '@/lib/studentAssessments';
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

  return <AssessmentWizard studentId={studentId} month={month} year={year} data={data} />;
}
