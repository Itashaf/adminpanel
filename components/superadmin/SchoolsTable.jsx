import Link from 'next/link';
import { FiMail, FiPhone, FiMoreVertical, FiLogIn, FiUserPlus, FiUserCheck, FiUserX } from 'react-icons/fi';
import DropdownMenu from '@/components/DropdownMenu';
import StatusPill from './StatusPill';

const AVATAR_COLORS = ['bg-violet-700', 'bg-blue-500', 'bg-indigo-600', 'bg-purple-500', 'bg-cyan-600', 'bg-pink-500'];

function initialsFor(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

function SchoolAvatar({ school, index }) {
  if (school.logoUrl) {
    return (
      <span className="flex items-center justify-center w-10 h-10 rounded-full overflow-hidden bg-gray-50 shrink-0">
        <img src={school.logoUrl} alt={school.name} className="w-full h-full object-contain p-1" />
      </span>
    );
  }
  return (
    <span
      className={`flex items-center justify-center w-10 h-10 rounded-full text-white text-sm font-semibold shrink-0 ${AVATAR_COLORS[index % AVATAR_COLORS.length]}`}
    >
      {initialsFor(school.name)}
    </span>
  );
}

function menuItemsFor(school, { onManage, onToggleStatus, onAssignAdmin }) {
  const isActive = school.status === 'Active';
  return [
    { label: 'Manage This School', icon: <FiLogIn className="w-4 h-4" />, onClick: () => onManage(school.id) },
    // Only offered when the school has no admin account yet — a school
    // that already has one manages it (edit permissions/reset password/
    // deactivate) from its own detail page's SchoolAdminCard, not from here.
    ...(!school.hasAdmin
      ? [{ label: 'Assign Admin', icon: <FiUserPlus className="w-4 h-4" />, onClick: () => onAssignAdmin(school) }]
      : []),
    {
      label: isActive ? 'Deactivate' : 'Activate',
      icon: isActive ? <FiUserX className="w-4 h-4" /> : <FiUserCheck className="w-4 h-4" />,
      onClick: () => onToggleStatus(school),
      danger: isActive,
    },
  ];
}

export default function SchoolsTable({ schools, onManage, onToggleStatus, onAssignAdmin }) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <th className="py-4 pl-6 pr-4">School</th>
              <th className="py-4 pr-4">Principal &amp; Contact</th>
              <th className="py-4 pr-4">Location</th>
              <th className="py-4 pr-4">Session</th>
              <th className="py-4 pr-4">Students</th>
              <th className="py-4 pr-4">Status</th>
              <th className="py-4 pr-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {schools.map((school, index) => (
              <tr key={school.id} className="hover:bg-gray-50/60 transition">
                <td className="py-5 pr-4 pl-6">
                  <Link href={`/super-admin/schools/${school.id}`} className="flex items-center gap-3 cursor-pointer">
                    <SchoolAvatar school={school} index={index} />
                    <div>
                      <p className="font-semibold text-gray-900 hover:text-indigo-700">{school.name}</p>
                      <p className="text-xs text-gray-400">{school.code}</p>
                    </div>
                  </Link>
                </td>
                <td className="py-5 pr-4">
                  <p className="font-medium text-gray-900">{school.principalName || '—'}</p>
                  <p className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                    <FiMail className="w-3 h-3" />
                    {school.email}
                  </p>
                </td>
                <td className="py-5 pr-4 text-gray-700">{[school.city, school.state].filter(Boolean).join(', ') || '—'}</td>
                <td className="py-5 pr-4 text-gray-700">{school.currentSessionName || '—'}</td>
                <td className="py-5 pr-4 text-gray-700">{school.studentCount.toLocaleString()}</td>
                <td className="py-5 pr-4">
                  <StatusPill status={school.status} />
                </td>
                <td className="py-5 pr-6 text-right">
                  <DropdownMenu trigger={<FiMoreVertical className="w-4 h-4" />} items={menuItemsFor(school, { onManage, onToggleStatus, onAssignAdmin })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden p-4 space-y-3">
        {schools.map((school, index) => (
          <div key={school.id} className="border border-gray-100 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <Link href={`/super-admin/schools/${school.id}`} className="flex items-center gap-3 cursor-pointer">
                <SchoolAvatar school={school} index={index} />
                <div>
                  <p className="font-medium text-gray-900 hover:text-indigo-700">{school.name}</p>
                  <p className="text-xs text-gray-400">{school.code}</p>
                </div>
              </Link>
              <DropdownMenu trigger={<FiMoreVertical className="w-4 h-4" />} items={menuItemsFor(school, { onManage, onToggleStatus, onAssignAdmin })} />
            </div>

            <div className="grid grid-cols-2 gap-y-2 mt-3 text-sm">
              <div>
                <p className="text-xs text-gray-400">Location</p>
                <p className="text-gray-700">{[school.city, school.state].filter(Boolean).join(', ') || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Status</p>
                <StatusPill status={school.status} />
              </div>
              <div>
                <p className="text-xs text-gray-400">Session</p>
                <p className="text-gray-700">{school.currentSessionName || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Students</p>
                <p className="text-gray-700">{school.studentCount.toLocaleString()}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-400">Principal &amp; Contact</p>
                <p className="flex items-center gap-1.5 text-gray-700 mt-0.5">
                  <FiPhone className="w-3 h-3 text-gray-400" />
                  {school.principalName || '—'} · {school.email}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
