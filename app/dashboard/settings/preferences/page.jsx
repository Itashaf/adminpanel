import PreferencesForm from '@/components/settings/PreferencesForm';
import { getSchoolSettings } from '@/lib/schoolSettings';

export const metadata = {
  title: 'System Preferences | SchoolApp 360',
};

export default async function PreferencesPage() {
  const school = await getSchoolSettings();
  return <PreferencesForm school={school} />;
}
