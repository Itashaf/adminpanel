import SupportInboxExplorer from '@/components/superadmin/SupportInboxExplorer';
import { getAllTickets } from '@/lib/support';

export const metadata = {
  title: 'Support | SchoolApp 360 Super Admin',
};

export const dynamic = 'force-dynamic';

export default async function SuperAdminSupportPage() {
  const tickets = await getAllTickets();
  return <SupportInboxExplorer initialTickets={tickets} />;
}
