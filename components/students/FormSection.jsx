export default function FormSection({ title, description, children, contentClassName = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sm:p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-indigo-700">{title}</h2>
        {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
      </div>
      <div className={contentClassName}>{children}</div>
    </div>
  );
}
