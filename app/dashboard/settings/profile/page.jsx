import SchoolProfileForm from '@/components/settings/SchoolProfileForm';
import { getSchoolSettings } from '@/lib/schoolSettings';

export const metadata = {
  title: 'School Profile | SchoolApp 360',
};

export default async function SchoolProfilePage() {
  const school = await getSchoolSettings();
  return <SchoolProfileForm school={school} />;
}
