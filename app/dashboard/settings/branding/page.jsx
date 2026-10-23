import BrandingForm from '@/components/settings/BrandingForm';
import { getSchoolSettings } from '@/lib/schoolSettings';
import { blockIfNotAdminTier } from '@/lib/roleGuard';

export const metadata = {
  title: 'Branding | SchoolApp 360',
};

export default async function BrandingPage() {
  await blockIfNotAdminTier();
  const school = await getSchoolSettings();
  return <BrandingForm school={school} />;
}
