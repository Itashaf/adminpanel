import { STATUS_META } from './statusStyles';

export default function StatusPill({ status }) {
  const meta = STATUS_META[status];
  if (!meta) return <span className="text-sm text-gray-400">—</span>;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-1 ${meta.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}
