import Link from 'next/link';
import { FiPhone } from 'react-icons/fi';
import StudentActionsMenu from './StudentActionsMenu';

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

function Avatar({ initials, photoUrl, index }) {
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

export default function StudentsTable({ students, selectedIds, onToggleSelect, onToggleSelectAll, onStudentDeleted, canManage = true }) {
  const allSelected = students.length > 0 && students.every((student) => selectedIds.includes(student.id));

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {canManage && (
                <th className="py-4 pl-6 pr-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={onToggleSelectAll}
                    className="w-[18px] h-[18px] rounded-md border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
              )}
              <th className={`py-4 pr-4 ${canManage ? '' : 'pl-6'}`}>Student &amp; ID</th>
              <th className="py-4 pr-4">Class / Section</th>
              <th className="py-4 pr-4">Guardian Contact</th>
              <th className="py-4 pr-4">Status</th>
              {canManage && <th className="py-4 pr-6 text-center">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {students.map((student, index) => (
              <tr key={student.id} className="hover:bg-gray-50/60 transition">
                {canManage && (
                  <td className="py-5 pl-6 pr-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(student.id)}
                      onChange={() => onToggleSelect(student.id)}
                      className="w-[18px] h-[18px] rounded-md border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </td>
                )}
                <td className={`py-5 pr-4 ${canManage ? '' : 'pl-6'}`}>
                  <Link href={`/dashboard/students/${student.id}`} className="flex items-center gap-3 cursor-pointer">
                    <Avatar initials={student.initials} photoUrl={student.photoUrl} index={index} />
                    <div>
                      <p className="font-semibold text-gray-900 hover:text-indigo-700">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-xs text-gray-400">{student.admissionId}</p>
                    </div>
                  </Link>
                </td>
                <td className="py-5 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-700">{student.class}</span>
                    {student.section && (
                      <span className="flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 text-xs font-semibold text-gray-600 shrink-0">
                        {student.section}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-5 pr-4">
                  <p className="font-medium text-gray-900">{student.guardian.fullName}</p>
                  <p className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                    <FiPhone className="w-3 h-3" />
                    {student.guardian.phone}
                  </p>
                </td>
                <td className="py-5 pr-4">
                  <StatusPill status={student.status} />
                </td>
                {canManage && (
                  <td className="py-5 pr-6 text-center">
                    <StudentActionsMenu student={student} onDeleted={onStudentDeleted} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden p-4 space-y-3">
        {students.map((student, index) => (
          <div key={student.id} className="border border-gray-100 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <label className="flex items-center gap-3 cursor-pointer">
                {canManage && (
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(student.id)}
                    onChange={() => onToggleSelect(student.id)}
                    className="w-[18px] h-[18px] rounded-md border-gray-300 cursor-pointer"
                  />
                )}
                <Avatar initials={student.initials} photoUrl={student.photoUrl} index={index} />
                <div>
                  <Link
                    href={`/dashboard/students/${student.id}`}
                    className="font-medium text-gray-900 hover:text-indigo-700 cursor-pointer"
                  >
                    {student.firstName} {student.lastName}
                  </Link>
                  <p className="text-xs text-gray-400">{student.admissionId}</p>
                </div>
              </label>
              {canManage && <StudentActionsMenu student={student} />}
            </div>

            <div className="grid grid-cols-2 gap-y-2 mt-3 text-sm">
              <div>
                <p className="text-xs text-gray-400">Class & Section</p>
                <p className="text-gray-700">{student.class}{student.section ? ` - ${student.section}` : ''}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Status</p>
                <StatusPill status={student.status} />
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-400">Parent/Guardian</p>
                <p className="text-gray-700">{student.guardian.fullName} · {student.guardian.phone}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
