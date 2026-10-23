'use client';

import { useState } from 'react';
import { FiArrowRight, FiCheck, FiCheckCircle, FiChevronDown, FiClock, FiFileText } from 'react-icons/fi';
import Modal from '@/components/Modal';
import RazorpayPayButton from '@/components/fees/RazorpayPayButton';
import { TERM_LABELS, TERM_DISPLAY_NAMES } from '@/lib/feeConstants';

const VISIBLE_ITEMS = 4;

function formatCurrency(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

const STATUS_PILL = {
  PAID: { label: 'PAID', Icon: FiCheck, className: 'text-green-600' },
  PARTIAL: { label: 'PARTIAL', Icon: FiClock, className: 'text-violet-600' },
  PENDING: { label: 'PENDING', Icon: FiClock, className: 'text-gray-600' },
};

function ItemRows({ items }) {
  return items.map((item) => (
    <div key={item.id} className="flex items-center justify-between text-[13px]">
      <span className="text-gray-600">{item.name}</span>
      <span className="text-gray-900 font-medium">{formatCurrency(item.amount)}</span>
    </div>
  ));
}

// Parent Portal's fee-term card — gradient header with status pill, line
// items, total, and a footer strip. Parents can only pay online (never record
// a manual collection), so this is the Parent-only counterpart of
// components/fees/StudentFeeTermCard.jsx (still used by the admin pages).
export default function ParentFeeTermCard({ term, fee, studentName, contact, email, onPaid }) {
  const [showAllItems, setShowAllItems] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [payError, setPayError] = useState('');

  const isPaid = fee?.status === 'PAID';
  const isPartial = fee?.status === 'PARTIAL';
  const remainingDue = fee ? fee.payableAmount - fee.paidAmount : 0;
  const pill = fee ? STATUS_PILL[fee.status] || STATUS_PILL.PENDING : null;
  const hiddenCount = fee ? Math.max(fee.items.length - VISIBLE_ITEMS, 0) : 0;
  const visibleItems = fee ? (showAllItems ? fee.items : fee.items.slice(0, VISIBLE_ITEMS)) : [];

  return (
    <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 text-white bg-indigo-700">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-white/15 shrink-0">
            <FiFileText className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-semibold leading-tight">{TERM_DISPLAY_NAMES[term]}</h3>
            <p className="text-xs text-white/80 mt-0.5">{TERM_LABELS[term]}</p>
          </div>
        </div>
        {pill && (
          <span className={`inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold ${pill.className}`}>
            <pill.Icon className="w-3.5 h-3.5" />
            {pill.label}
          </span>
        )}
      </div>

      {!fee ? (
        <div className="text-center py-7 px-5">
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 text-gray-400 mb-2">
            <FiFileText className="w-5 h-5" />
          </span>
          <p className="text-sm font-semibold text-gray-800">Not generated yet</p>
          <p className="text-xs text-gray-400 mt-1">Fee details for this quarter will be available soon.</p>
        </div>
      ) : (
        <div className="p-5">
          <div className="space-y-2">
            <ItemRows items={visibleItems} />
          </div>

          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAllItems((prev) => !prev)}
              className="w-full flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5 mt-2.5 text-xs text-gray-500 hover:bg-gray-100 transition cursor-pointer"
            >
              {showAllItems ? 'Show less' : `+ ${hiddenCount} more item${hiddenCount === 1 ? '' : 's'}`}
              <FiChevronDown className={`w-4 h-4 transition-transform ${showAllItems ? 'rotate-180' : ''}`} />
            </button>
          )}

          <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100">
            <span className="text-sm font-semibold text-gray-900">Total</span>
            {fee.discountAmount > 0 ? (
              <span className="text-right">
                <span className="block text-xs text-gray-400 line-through">{formatCurrency(fee.totalAmount)}</span>
                <span className="text-xl font-bold text-indigo-600">{formatCurrency(fee.payableAmount)}</span>
              </span>
            ) : (
              <span className="text-xl font-bold text-gray-900">{formatCurrency(fee.totalAmount)}</span>
            )}
          </div>

          <div
            className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 mt-3 ${
              isPaid ? 'bg-green-50' : 'bg-gray-50'
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-medium min-w-0">
              {isPaid ? (
                <>
                  <FiCheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                  <span className="text-green-700">Paid in full</span>
                </>
              ) : (
                <>
                  <FiClock className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-gray-600 truncate">
                    {isPartial ? `Due ${formatCurrency(remainingDue)}` : 'Awaiting payment'}
                  </span>
                </>
              )}
            </span>
            <button
              type="button"
              onClick={() => setShowDetails(true)}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer shrink-0"
            >
              View Details
              <FiArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {!isPaid && (
            <div className="mt-3 space-y-2">
              <RazorpayPayButton
                fee={fee}
                studentName={studentName}
                contact={contact}
                email={email}
                onSuccess={(updatedFee, message) => {
                  setPayError('');
                  onPaid?.(updatedFee, message);
                }}
                onError={setPayError}
              />
              {payError && <p className="text-xs text-red-500 text-center">{payError}</p>}
            </div>
          )}

          <Modal
            isOpen={showDetails}
            onClose={() => setShowDetails(false)}
            title={`${TERM_DISPLAY_NAMES[term]} Fee Details`}
            description={TERM_LABELS[term]}
            icon={<FiFileText className="w-5 h-5" />}
          >
            <div className="space-y-3">
              <ItemRows items={fee.items} />
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-sm">
              <div className="flex items-center justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(fee.totalAmount)}</span>
              </div>
              {fee.discountAmount > 0 && (
                <div className="flex items-center justify-between text-gray-600">
                  <span>Discount</span>
                  <span>- {formatCurrency(fee.discountAmount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between font-semibold text-gray-900">
                <span>Payable</span>
                <span>{formatCurrency(fee.payableAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-green-700">
                <span>Paid</span>
                <span>{formatCurrency(fee.paidAmount)}</span>
              </div>
              <div className="flex items-center justify-between font-semibold text-gray-900">
                <span>Balance</span>
                <span>{formatCurrency(remainingDue)}</span>
              </div>
            </div>
          </Modal>
        </div>
      )}
    </div>
  );
}
