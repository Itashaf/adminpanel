import AttendanceRulesForm from '@/components/settings/AttendanceRulesForm';
import { getSchoolSettings } from '@/lib/schoolSettings';

export const metadata = {
  title: 'Attendance Rules | SchoolApp 360',
};

export default async function AttendanceRulesPage() {
  const school = await getSchoolSettings();
  return <AttendanceRulesForm school={school} />;
}
