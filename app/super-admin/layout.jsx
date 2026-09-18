import SuperAdminTopbar from '@/components/superadmin/SuperAdminTopbar';
import SuperAdminNav from '@/components/superadmin/SuperAdminNav';

export default function SuperAdminLayout({ children }) {
  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-gray-50">
      <SuperAdminTopbar />
      <SuperAdminNav />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
    </div>
  );
}
