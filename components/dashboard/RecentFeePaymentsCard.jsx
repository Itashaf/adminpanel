import Link from 'next/link';
import { FiArrowRight } from 'react-icons/fi';
import Badge from '@/components/Badge';
import { Avatar } from '@/components/settings/RolesPermissionsExplorer';

function formatCurrency(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_VARIANTS = { SUCCESS: 'green', PENDING: 'amber', FAILED: 'red' };
const STATUS_LABELS = { SUCCESS: 'Paid', PENDING: 'Pending', FAILED: 'Failed' };

// The Accountant dashboard's "what just came in" table — the most recent
// successful/attempted payments across the whole school, real rows from
// lib/fees.js's getPayments (same data the full Payments page uses).
export default function RecentFeePaymentsCard({ payments }) {
  return (
    <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Recent Fee Payments</h3>
        <Link href="/dashboard/fees/payments" className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700">
          View All
          <FiArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {payments.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No payments recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide border-b border-gray-100">
                <th className="py-2 pr-3">Student Name</th>
                <th className="py-2 pr-3">Class</th>
                <th className="py-2 pr-3">Amount</th>
                <th className="py-2 pr-3">Date</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p, i) => (
                <tr key={p.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={p.studentName} seed={i} />
                      <span className="font-medium text-gray-900 truncate">{p.studentName}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-gray-600">{p.class ? (p.section ? `${p.class} - ${p.section}` : p.class) : '—'}</td>
                  <td className="py-3 pr-3 font-semibold text-gray-900">{formatCurrency(p.amount)}</td>
                  <td className="py-3 pr-3 text-gray-500">{formatDate(p.paidAt || p.createdAt)}</td>
                  <td className="py-3">
                    <Badge label={STATUS_LABELS[p.status] || p.status} variant={STATUS_VARIANTS[p.status] || 'gray'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
