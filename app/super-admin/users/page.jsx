import SuperAdminUsersExplorer from '@/components/superadmin/SuperAdminUsersExplorer';

export const metadata = {
  title: 'Users | SchoolApp 360 Super Admin',
};

// Client-fetched (GET /api/users, GET /api/schools) — no server-side data
// to prerender, same reasoning as the Roles & Permissions page.
export const dynamic = 'force-dynamic';

export default function SuperAdminUsersPage() {
  return <SuperAdminUsersExplorer />;
}
