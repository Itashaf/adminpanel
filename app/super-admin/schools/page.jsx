import SchoolsDirectory from '@/components/superadmin/SchoolsDirectory';
import { getAllSchools } from '@/lib/schools';

export const metadata = {
  title: 'Schools | SchoolApp 360 Super Admin',
};

export default async function SchoolsPage() {
  const schools = await getAllSchools();
  return <SchoolsDirectory schools={schools} />;
}
