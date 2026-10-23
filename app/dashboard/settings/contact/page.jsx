import ContactAddressForm from '@/components/settings/ContactAddressForm';
import { getSchoolSettings } from '@/lib/schoolSettings';
import { blockIfNotAdminTier } from '@/lib/roleGuard';

export const metadata = {
  title: 'Contact & Address | SchoolApp 360',
};

export default async function ContactAddressPage() {
  await blockIfNotAdminTier();
  const school = await getSchoolSettings();
  return <ContactAddressForm school={school} />;
}
