import SubjectsExplorer from '@/components/academics/SubjectsExplorer';
import { getSubjects } from '@/lib/subjects';
import { blockIfTeacher } from '@/lib/roleGuard';

export const metadata = {
  title: 'Subjects | SchoolApp 360',
};

export default async function SubjectsPage() {
  // Moved here from the shared academics/layout.jsx, which used to block
  // every route under /dashboard/academics/* (including Timetable and
  // Calendar, which a Teacher now has real access to) — Subjects itself
  // stays Admin-only.
  await blockIfTeacher();
  const subjects = await getSubjects();
  return <SubjectsExplorer initialSubjects={subjects} />;
}
