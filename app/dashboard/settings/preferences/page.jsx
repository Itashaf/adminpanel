import PreferencesForm from '@/components/settings/PreferencesForm';
import { getSchoolSettings } from '@/lib/schoolSettings';
import { blockIfNotAdminTier } from '@/lib/roleGuard';

export const metadata = {
  title: 'System Preferences | SchoolApp 360',
};

export default async function PreferencesPage() {
  await blockIfNotAdminTier();
  const school = await getSchoolSettings();
  return <PreferencesForm school={school} />;
}
