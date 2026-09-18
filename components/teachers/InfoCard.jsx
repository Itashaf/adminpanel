export default function InfoCard({ title, subtitle, icon: Icon, fields }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
      <div className="flex items-center gap-4 mb-6">
        {Icon && (
          <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-violet-100 text-violet-600 shrink-0">
            <Icon className="w-5 h-5" />
          </span>
        )}
        <div>
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>

      <dl className="bg-gray-50 rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {fields.map(({ label, value }) => (
          <div key={label}>
            <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">{label}</dt>
            <dd className="text-base font-bold text-gray-900">{value || '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
