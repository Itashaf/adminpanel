import PaymentsExplorer from '@/components/fees/PaymentsExplorer';
import { getPayments } from '@/lib/fees';
import { blockIfTeacher } from '@/lib/roleGuard';

export const metadata = {
  title: 'Payment History | SchoolApp 360',
};

export default async function PaymentsPage() {
  await blockIfTeacher();
  const initialResult = await getPayments({ pageSize: 10 });
  return <PaymentsExplorer initialResult={initialResult} />;
}
