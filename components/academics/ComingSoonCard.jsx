export default function ComingSoonCard({ icon, title, description }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
        <span className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-100 text-violet-600 mb-5">
          {icon}
        </span>
        <h3 className="text-lg font-bold text-gray-900">Coming soon</h3>
        <p className="text-sm text-gray-500 mt-1.5 max-w-sm mx-auto">This module isn&apos;t built yet — check back soon.</p>
      </div>
    </div>
  );
}
