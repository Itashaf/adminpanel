import { getCurrentRBACUser } from '@/lib/rbac';
import RolesPermissionsExplorer from '@/components/settings/RolesPermissionsExplorer';

export const metadata = {
  title: 'Roles & Permissions | SchoolApp 360',
};

export default async function RolesPermissionsPage() {
  const user = await getCurrentRBACUser();

  // getCurrentRBACUser() only resolves a session created after the RBAC
  // login cutover (tasks 12-15) — a browser tab still holding a session
  // from before that ships has no `userId` in its cookie yet. Not an error
  // state, just a stale token; re-signing in refreshes it. Shown inline,
  // not a redirect loop, since the visitor IS validly signed in under the
  // legacy shape (they got past middleware.js/blockIfTeacher() to reach
  // this page at all).
  if (!user) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <p className="text-sm text-gray-500">
          Your session needs a refresh to use Roles &amp; Permissions — please log out and back in.
        </p>
      </div>
    );
  }

  const can = {
    viewRoles: user.permissions.has('roles.view'),
    manageRoles: user.permissions.has('roles.manage'),
    viewPermissions: user.permissions.has('permissions.view'),
    managePermissions: user.permissions.has('permissions.manage'),
    viewUsers: user.permissions.has('users.view'),
    createUsers: user.permissions.has('users.create'),
    updateUsers: user.permissions.has('users.update'),
  };

  if (!can.viewRoles && !can.viewUsers) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <p className="text-sm text-gray-500">You don&apos;t have access to Roles &amp; Permissions.</p>
      </div>
    );
  }

  return <RolesPermissionsExplorer can={can} actorRoleKey={user.roleKey} actorUserId={user.id} />;
}
