import PaymentsExplorer from '@/components/fees/PaymentsExplorer';
import { getPayments } from '@/lib/fees';
import { getAllStudents } from '@/lib/students';
import { resolveSchoolId } from '@/lib/auth/schoolContext';

export const metadata = {
  title: 'Payment History | SchoolApp 360',
};

export default async function PaymentsPage() {
  const [initialResult, students] = await Promise.all([
    getPayments({ pageSize: 10 }),
    getAllStudents(await resolveSchoolId()),
  ]);
  return <PaymentsExplorer initialResult={initialResult} students={students} />;
}
