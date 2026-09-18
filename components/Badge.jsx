const VARIANTS = {
  green: 'bg-green-50 text-green-700',
  amber: 'bg-amber-50 text-amber-700',
  gray: 'bg-gray-100 text-gray-600',
  violet: 'bg-violet-50 text-violet-700',
  red: 'bg-red-50 text-red-600',
  blue: 'bg-blue-50 text-blue-700',
  pink: 'bg-pink-50 text-pink-700',
  purple: 'bg-purple-50 text-purple-700',
  orange: 'bg-orange-50 text-orange-700',
  cyan: 'bg-cyan-50 text-cyan-700',
  indigo: 'bg-indigo-50 text-indigo-700',
  teal: 'bg-teal-50 text-teal-700',
};

export default function Badge({ label, variant = 'gray' }) {
  return (
    <span className={`inline-block text-xs font-medium rounded-full px-2.5 py-1 ${VARIANTS[variant]}`}>
      {label}
    </span>
  );
}
