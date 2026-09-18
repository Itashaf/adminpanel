import BrandingForm from '@/components/settings/BrandingForm';
import { getSchoolSettings } from '@/lib/schoolSettings';

export const metadata = {
  title: 'Branding | SchoolApp 360',
};

export default async function BrandingPage() {
  const school = await getSchoolSettings();
  return <BrandingForm school={school} />;
}
