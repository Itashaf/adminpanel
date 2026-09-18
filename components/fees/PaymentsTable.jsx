import Badge from '@/components/Badge';
import { TERM_LABELS } from '@/lib/feeConstants';

const STATUS_VARIANTS = { SUCCESS: 'green', PENDING: 'amber', FAILED: 'red' };

function formatCurrency(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function formatClassSection(payment) {
  if (!payment.class) return '—';
  return payment.section ? `${payment.class} - ${payment.section}` : payment.class;
}

export default function PaymentsTable({ payments, startIndex = 0 }) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <th className="py-4 pl-6 pr-2 w-12">S.No.</th>
              <th className="py-4 pr-4">Date</th>
              <th className="py-4 pr-4">Student</th>
              <th className="py-4 pr-4">Class</th>
              <th className="py-4 pr-4">Term</th>
              <th className="py-4 pr-4">Amount</th>
              <th className="py-4 pr-4">Method</th>
              <th className="py-4 pr-4">Status</th>
              <th className="py-4 pr-6">Transaction ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payments.map((payment, index) => (
              <tr key={payment.id} className="hover:bg-gray-50/60 transition">
                <td className="py-4 pl-6 pr-2 text-gray-400">{startIndex + index + 1}</td>
                <td className="py-4 pr-4 text-gray-700">{payment.paidAt || payment.createdAt}</td>
                <td className="py-4 pr-4 font-medium text-gray-900">{payment.studentName}</td>
                <td className="py-4 pr-4 text-gray-700">{formatClassSection(payment)}</td>
                <td className="py-4 pr-4 text-gray-700">{TERM_LABELS[payment.term] || payment.term}</td>
                <td className="py-4 pr-4 font-semibold text-gray-900">{formatCurrency(payment.amount)}</td>
                <td className="py-4 pr-4 text-gray-700">{payment.method}</td>
                <td className="py-4 pr-4">
                  <Badge label={payment.status} variant={STATUS_VARIANTS[payment.status] || 'gray'} />
                </td>
                <td className="py-4 pr-6 text-gray-400 font-mono text-xs">{payment.razorpayPaymentId || payment.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden p-4 space-y-3">
        {payments.map((payment) => (
          <div key={payment.id} className="border border-gray-100 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-gray-900">{payment.studentName}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatClassSection(payment)} · {TERM_LABELS[payment.term] || payment.term} · {payment.paidAt || payment.createdAt}
                </p>
              </div>
              <Badge label={payment.status} variant={STATUS_VARIANTS[payment.status] || 'gray'} />
            </div>
            <div className="grid grid-cols-2 gap-y-2 mt-3 text-sm">
              <div>
                <p className="text-xs text-gray-400">Amount</p>
                <p className="text-gray-900 font-semibold">{formatCurrency(payment.amount)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Method</p>
                <p className="text-gray-700">{payment.method}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
