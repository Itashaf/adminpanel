import Badge from '@/components/Badge';

export default function SectionOverviewCard({ classInfo, section }) {
  const fields = [
    { label: 'Section Name', value: `Section ${section.name}` },
    { label: 'Class', value: classInfo.name },
    { label: 'Academic Session', value: classInfo.academicSession },
    { label: 'Class Teacher', value: section.classTeacherName || 'Unassigned' },
    { label: 'Room', value: section.room },
    { label: 'Maximum Capacity', value: section.capacity },
    { label: 'Current Students', value: section.studentCount },
    { label: 'Boys', value: <span className="text-blue-600 font-semibold">{section.boys}</span> },
    { label: 'Girls', value: <span className="text-pink-600 font-semibold">{section.girls}</span> },
    { label: 'Status', value: <Badge label={section.status} variant={section.status === 'Active' ? 'green' : 'gray'} /> },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sm:p-6">
      <h3 className="text-base font-semibold text-indigo-700 mb-4">Section Overview</h3>
      <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {fields.map(({ label, value }) => (
          <div key={label}>
            <dt className="text-xs text-gray-400 uppercase tracking-wide">{label}</dt>
            <dd className="text-sm font-medium text-gray-900 mt-1">{value || '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
