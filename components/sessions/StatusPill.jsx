const STATUS_STYLES = {
  Active: { dot: 'bg-green-600', pill: 'bg-green-50 text-green-700' },
  Upcoming: { dot: 'bg-blue-600', pill: 'bg-blue-50 text-blue-700' },
  Archived: { dot: 'bg-gray-400', pill: 'bg-gray-100 text-gray-500' },
};

export default function StatusPill({ status, size = 'md' }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.Archived;
  const sizeClassName = size === 'lg' ? 'text-sm px-4 py-2 gap-2' : 'text-xs px-2.5 py-1 gap-1.5';
  const dotSizeClassName = size === 'lg' ? 'w-2 h-2' : 'w-1.5 h-1.5';

  return (
    <span className={`inline-flex items-center font-semibold rounded-full ${sizeClassName} ${style.pill}`}>
      <span className={`rounded-full shrink-0 ${dotSizeClassName} ${style.dot}`} />
      {status}
    </span>
  );
}
