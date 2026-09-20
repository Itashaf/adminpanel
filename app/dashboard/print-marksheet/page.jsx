import PrintMarksheetClient from '@/components/exams/PrintMarksheetClient';
import { getPrintableClassSections } from '@/lib/printMarksheet';
import { getCurrentUser } from '@/lib/currentUser';
import { getCurrentUserInfo } from '@/lib/iam';

export const metadata = {
  title: 'Print Marksheet | SchoolApp 360',
};

// Not nested under app/dashboard/exams/** — that tree's layout blocks every
// Teacher, but a Class Teacher needs this page just as much as Admin does.
// It's still reachable from the "Exams" nav group (see Sidebar.jsx) —
// nav grouping and URL nesting don't have to match.
export default async function PrintMarksheetPage() {
  // Real session first — getPrintableClassSections reads currentUser.
  // classTeacherOf directly (see lib/printMarksheet.js), a field only
  // getCurrentUserInfo() ever populates; the dashboard-toggle fallback
  // (lib/currentUser.js) never has it, which left a Class Teacher seeing no
  // printable sections at all.
  const currentUser = (await getCurrentUserInfo()) || (await getCurrentUser());
  const classSections = await getPrintableClassSections(currentUser);

  return <PrintMarksheetClient classSections={classSections} isTeacher={currentUser.role === 'Teacher'} />;
}
