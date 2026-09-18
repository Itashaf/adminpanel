import { FiUser, FiPhone, FiMail, FiBriefcase, FiCreditCard } from 'react-icons/fi';

export default function GuardianCard({ guardian }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-violet-100 text-violet-600 shrink-0">
            <FiUser className="w-5 h-5" />
          </span>
          <p className="text-lg font-bold text-gray-900 truncate">{guardian.fullName}</p>
        </div>
        <span className="text-xs font-semibold text-violet-700 bg-violet-50 rounded-full px-3 py-1 shrink-0">
          {guardian.relationship}
        </span>
      </div>

      <div className="bg-gray-50 rounded-2xl p-4 space-y-2.5 text-sm text-gray-700">
        <p className="flex items-center gap-2">
          <FiPhone className="w-4 h-4 text-gray-400 shrink-0" />
          {guardian.phone}
        </p>
        {guardian.email && (
          <p className="flex items-center gap-2">
            <FiMail className="w-4 h-4 text-gray-400 shrink-0" />
            {guardian.email}
          </p>
        )}
        {guardian.occupation && (
          <p className="flex items-center gap-2">
            <FiBriefcase className="w-4 h-4 text-gray-400 shrink-0" />
            {guardian.occupation}
          </p>
        )}
        {guardian.aadhaarNumber && (
          <p className="flex items-center gap-2">
            <FiCreditCard className="w-4 h-4 text-gray-400 shrink-0" />
            {guardian.aadhaarNumber}
          </p>
        )}
      </div>
    </div>
  );
}
