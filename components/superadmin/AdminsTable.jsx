import Link from 'next/link';
import { FiMail, FiMoreVertical, FiSliders, FiKey, FiUserCheck, FiUserX } from 'react-icons/fi';
import DropdownMenu from '@/components/DropdownMenu';
import StatusPill from './StatusPill';
import { ADMIN_PERMISSIONS } from '@/lib/adminConstants';

const AVATAR_COLORS = ['bg-violet-700', 'bg-blue-500', 'bg-indigo-600', 'bg-purple-500', 'bg-cyan-600'];

function initialsFor(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

function menuItemsFor(admin, { onEditPermissions, onResetPassword, onToggleStatus }) {
  const isActive = admin.status === 'Active';
  return [
    { label: 'Edit Permissions', icon: <FiSliders className="w-4 h-4" />, onClick: () => onEditPermissions(admin) },
    { label: 'Reset Password', icon: <FiKey className="w-4 h-4" />, onClick: () => onResetPassword(admin) },
    {
      label: isActive ? 'Deactivate' : 'Activate',
      icon: isActive ? <FiUserX className="w-4 h-4" /> : <FiUserCheck className="w-4 h-4" />,
      onClick: () => onToggleStatus(admin),
      danger: isActive,
    },
  ];
}

export default function AdminsTable({ admins, onEditPermissions, onResetPassword, onToggleStatus }) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <th className="py-4 pl-6 pr-4">Admin</th>
              <th className="py-4 pr-4">School</th>
              <th className="py-4 pr-4">Permissions</th>
              <th className="py-4 pr-4">Status</th>
              <th className="py-4 pr-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {admins.map((admin, index) => {
              const grantedCount = ADMIN_PERMISSIONS.filter(({ key }) => admin.permissions?.[key]).length;
              return (
                <tr key={admin.id} className="hover:bg-gray-50/60 transition">
                  <td className="py-5 pr-4 pl-6">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex items-center justify-center w-10 h-10 rounded-full text-white text-sm font-semibold shrink-0 ${AVATAR_COLORS[index % AVATAR_COLORS.length]}`}
                      >
                        {initialsFor(admin.name)}
                      </span>
                      <div>
                        <p className="font-semibold text-gray-900">{admin.name}</p>
                        <p className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                          <FiMail className="w-3 h-3" />
                          {admin.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-5 pr-4">
                    <Link href={`/super-admin/schools/${admin.schoolId}`} className="text-gray-700 hover:text-indigo-700 cursor-pointer">
                      {admin.schoolName}
                    </Link>
                  </td>
                  <td className="py-5 pr-4 text-gray-700">
                    {grantedCount} / {ADMIN_PERMISSIONS.length}
                  </td>
                  <td className="py-5 pr-4">
                    <StatusPill status={admin.status} />
                  </td>
                  <td className="py-5 pr-6 text-right">
                    <DropdownMenu
                      trigger={<FiMoreVertical className="w-4 h-4" />}
                      items={menuItemsFor(admin, { onEditPermissions, onResetPassword, onToggleStatus })}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden p-4 space-y-3">
        {admins.map((admin, index) => {
          const grantedCount = ADMIN_PERMISSIONS.filter(({ key }) => admin.permissions?.[key]).length;
          return (
            <div key={admin.id} className="border border-gray-100 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex items-center justify-center w-10 h-10 rounded-full text-white text-sm font-semibold shrink-0 ${AVATAR_COLORS[index % AVATAR_COLORS.length]}`}
                  >
                    {initialsFor(admin.name)}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">{admin.name}</p>
                    <p className="text-xs text-gray-400">{admin.email}</p>
                  </div>
                </div>
                <DropdownMenu
                  trigger={<FiMoreVertical className="w-4 h-4" />}
                  items={menuItemsFor(admin, { onEditPermissions, onResetPassword, onToggleStatus })}
                />
              </div>

              <div className="grid grid-cols-2 gap-y-2 mt-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400">School</p>
                  <Link href={`/super-admin/schools/${admin.schoolId}`} className="text-gray-700 hover:text-indigo-700 cursor-pointer">
                    {admin.schoolName}
                  </Link>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Status</p>
                  <StatusPill status={admin.status} />
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-400">Permissions</p>
                  <p className="text-gray-700">{grantedCount} / {ADMIN_PERMISSIONS.length} granted</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
