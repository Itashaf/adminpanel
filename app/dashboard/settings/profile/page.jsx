import SchoolProfileForm from '@/components/settings/SchoolProfileForm';
import { getSchoolSettings } from '@/lib/schoolSettings';
import { blockIfNotAdminTier } from '@/lib/roleGuard';

export const metadata = {
  title: 'School Profile | SchoolApp 360',
};

export default async function SchoolProfilePage() {
  await blockIfNotAdminTier();
  const school = await getSchoolSettings();
  return <SchoolProfileForm school={school} />;
}
