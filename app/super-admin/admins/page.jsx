import AdminsDirectory from '@/components/superadmin/AdminsDirectory';
import { getAllAdmins, getAdminDirectorySummary } from '@/lib/admins';

export const metadata = {
  title: 'Admins | SchoolApp 360 Super Admin',
};

// See app/super-admin/schools/page.jsx — same fix, same reason.
export const dynamic = 'force-dynamic';

export default async function AdminsPage() {
  const [admins, summary] = await Promise.all([getAllAdmins(), getAdminDirectorySummary()]);
  return <AdminsDirectory admins={admins} schoolsWithoutAdmin={summary.schoolsWithoutAdmin} />;
}
