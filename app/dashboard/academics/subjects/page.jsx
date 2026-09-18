import SubjectsExplorer from '@/components/academics/SubjectsExplorer';
import { getSubjects } from '@/lib/subjects';

export const metadata = {
  title: 'Subjects | SchoolApp 360',
};

export default async function SubjectsPage() {
  const subjects = await getSubjects();
  return <SubjectsExplorer initialSubjects={subjects} />;
}
