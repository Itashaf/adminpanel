import ContactAddressForm from '@/components/settings/ContactAddressForm';
import { getSchoolSettings } from '@/lib/schoolSettings';

export const metadata = {
  title: 'Contact & Address | SchoolApp 360',
};

export default async function ContactAddressPage() {
  const school = await getSchoolSettings();
  return <ContactAddressForm school={school} />;
}
