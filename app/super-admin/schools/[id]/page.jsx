import { notFound } from 'next/navigation';
import SchoolDetailsHeader from '@/components/superadmin/SchoolDetailsHeader';
import SchoolStatsCards from '@/components/superadmin/SchoolStatsCards';
import SchoolOverviewCard from '@/components/superadmin/SchoolOverviewCard';
import SchoolAdminCard from '@/components/superadmin/SchoolAdminCard';
import { getSchoolDirectoryEntry } from '@/lib/schools';
import { getAdminBySchoolId } from '@/lib/admins';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const school = await getSchoolDirectoryEntry(id);
  return { title: school ? `${school.name} | SchoolApp 360 Super Admin` : 'School | SchoolApp 360 Super Admin' };
}

export default async function SchoolDetailsPage({ params }) {
  const { id } = await params;
  const [school, admin] = await Promise.all([getSchoolDirectoryEntry(id), getAdminBySchoolId(id)]);

  if (!school) notFound();

  return (
    <div className="space-y-6">
      <SchoolDetailsHeader school={school} />
      <SchoolStatsCards school={school} />
      <SchoolAdminCard school={school} admin={admin} />
      <SchoolOverviewCard school={school} />
    </div>
  );
}
