import AttendanceRulesForm from '@/components/settings/AttendanceRulesForm';
import { getSchoolSettings } from '@/lib/schoolSettings';
import { blockIfNotAdminTier } from '@/lib/roleGuard';

export const metadata = {
  title: 'Attendance Rules | SchoolApp 360',
};

export default async function AttendanceRulesPage() {
  await blockIfNotAdminTier();
  const school = await getSchoolSettings();
  return <AttendanceRulesForm school={school} />;
}
