import { FiLayers, FiCalendar, FiBook, FiPlus } from 'react-icons/fi';

function InfoItem({ icon, iconBgClass, iconTextClass, label, value, valueClass, isLast }) {
  return (
    <div className={`flex items-center gap-3 pl-6 first:pl-0 ${isLast ? '' : 'border-r border-gray-100'}`}>
      {iconBgClass ? (
        <span className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${iconBgClass} ${iconTextClass}`}>
          {icon}
        </span>
      ) : (
        <span className={`shrink-0 ${iconTextClass}`}>{icon}</span>
      )}
      <div>
        <p className="text-sm text-gray-500 leading-tight">{label}</p>
        <p className={`text-lg font-bold leading-tight mt-0.5 ${valueClass || 'text-gray-900'}`}>{value}</p>
      </div>
    </div>
  );
}

export default function ClassInfoCard({ cls, onAddSubject }) {
  const isActive = cls.status === 'Active';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 shrink-0">
            <FiLayers className="w-6 h-6" />
          </span>
          <h3 className="text-xl font-bold text-gray-900">Class Information</h3>
        </div>

        <span
          className={`flex items-center gap-2 shrink-0 text-sm font-semibold rounded-full px-4 py-2 ${
            isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-600' : 'bg-gray-400'}`} />
          {cls.status}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4">
        <InfoItem icon={<FiCalendar className="w-6 h-6" />} iconTextClass="text-blue-700" label="Class" value={cls.name} />
        <InfoItem
          icon={<FiCalendar className="w-6 h-6" />}
          iconTextClass="text-blue-700"
          label="Session"
          value={cls.academicSession}
        />
        <InfoItem
          icon={<span className="text-lg leading-none">♂</span>}
          iconBgClass="bg-blue-50"
          iconTextClass="text-blue-600"
          label="Boys"
          value={cls.totalBoys}
          valueClass="text-blue-600"
        />
        <InfoItem
          icon={<span className="text-lg leading-none">♀</span>}
          iconBgClass="bg-pink-50"
          iconTextClass="text-pink-600"
          label="Girls"
          value={cls.totalGirls}
          valueClass="text-pink-600"
          isLast
        />
      </div>

      <div className="border-t border-gray-100 mt-6 pt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
        <span className="flex items-center gap-2 text-base font-bold text-gray-900 shrink-0 mr-2">
          <FiBook className="w-6 h-6 text-gray-700" />
          Assigned Subjects
        </span>
        {(cls.subjects || []).map((subject) => (
          <span key={subject} className="text-sm font-semibold text-indigo-700 bg-indigo-50 rounded-full px-4 py-2">
            {subject}
          </span>
        ))}
        <button
          type="button"
          onClick={onAddSubject}
          className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 border border-dashed border-indigo-300 rounded-full px-4 py-2 hover:bg-indigo-50 transition cursor-pointer"
        >
          <FiPlus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>
    </div>
  );
}
