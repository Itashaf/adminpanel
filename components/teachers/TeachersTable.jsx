import Link from 'next/link';
import { FiMail, FiPhone } from 'react-icons/fi';
import TeacherActionsMenu from './TeacherActionsMenu';

const AVATAR_COLORS = ['bg-blue-500', 'bg-violet-700', 'bg-purple-500', 'bg-indigo-600', 'bg-pink-500', 'bg-cyan-600'];

function StatusPill({ status }) {
  const isActive = status === 'Active';
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1 ${
        isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-600' : 'bg-gray-400'}`} />
      {status}
    </span>
  );
}

function Avatar({ initials, index, photoUrl }) {
  if (photoUrl) {
    return <img src={photoUrl} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />;
  }
  return (
    <span
      className={`flex items-center justify-center w-10 h-10 rounded-full text-white text-sm font-semibold shrink-0 ${AVATAR_COLORS[index % AVATAR_COLORS.length]}`}
    >
      {initials}
    </span>
  );
}

function formatAssignments(assignments) {
  if (!assignments?.length) return '—';
  return assignments.map((a) => `${a.class}${a.section}`).join(', ');
}

export default function TeachersTable({ teachers, classOptions, selectedIds, onToggleSelect, onToggleSelectAll }) {
  const allSelected = teachers.length > 0 && teachers.every((teacher) => selectedIds.includes(teacher.id));

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <th className="py-4 pl-6 pr-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  className="w-[18px] h-[18px] rounded-md border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </th>
              <th className="py-4 pr-4">Teacher &amp; ID</th>
              <th className="py-4 pr-4">Assigned Classes</th>
              <th className="py-4 pr-4">Contact</th>
              <th className="py-4 pr-4">Status</th>
              <th className="py-4 pr-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {teachers.map((teacher, index) => (
              <tr key={teacher.id} className="hover:bg-gray-50/60 transition">
                <td className="py-5 pl-6 pr-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(teacher.id)}
                    onChange={() => onToggleSelect(teacher.id)}
                    className="w-[18px] h-[18px] rounded-md border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </td>
                <td className="py-5 pr-4">
                  <Link href={`/dashboard/teachers/${teacher.id}`} className="flex items-center gap-3 cursor-pointer">
                    <Avatar initials={teacher.initials} index={index} photoUrl={teacher.photoUrl} />
                    <div>
                      <p className="font-semibold text-gray-900 hover:text-indigo-700">
                        {teacher.firstName} {teacher.lastName}
                      </p>
                      <p className="text-xs text-gray-400">{teacher.employeeId}</p>
                    </div>
                  </Link>
                </td>
                <td className="py-5 pr-4 text-gray-600">{formatAssignments(teacher.assignments)}</td>
                <td className="py-5 pr-4">
                  <p className="flex items-center gap-1.5 text-gray-700">
                    <FiMail className="w-3.5 h-3.5 text-gray-400" />
                    {teacher.email}
                  </p>
                  <p className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                    <FiPhone className="w-3 h-3" />
                    {teacher.phone}
                  </p>
                </td>
                <td className="py-5 pr-4">
                  <StatusPill status={teacher.status} />
                </td>
                <td className="py-5 pr-6 text-right">
                  <TeacherActionsMenu teacher={teacher} classOptions={classOptions} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden p-4 space-y-3">
        {teachers.map((teacher, index) => (
          <div key={teacher.id} className="border border-gray-100 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(teacher.id)}
                  onChange={() => onToggleSelect(teacher.id)}
                  className="w-[18px] h-[18px] rounded-md border-gray-300 cursor-pointer"
                />
                <Avatar initials={teacher.initials} index={index} photoUrl={teacher.photoUrl} />
                <div>
                  <Link
                    href={`/dashboard/teachers/${teacher.id}`}
                    className="font-medium text-gray-900 hover:text-indigo-700 cursor-pointer"
                  >
                    {teacher.firstName} {teacher.lastName}
                  </Link>
                  <p className="text-xs text-gray-400">{teacher.employeeId}</p>
                </div>
              </label>
              <TeacherActionsMenu teacher={teacher} classOptions={classOptions} />
            </div>

            <div className="grid grid-cols-2 gap-y-2 mt-3 text-sm">
              <div>
                <p className="text-xs text-gray-400">Assigned Classes</p>
                <p className="text-gray-700">{formatAssignments(teacher.assignments)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Status</p>
                <StatusPill status={teacher.status} />
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-400">Contact</p>
                <p className="text-gray-700">{teacher.email} · {teacher.phone}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
