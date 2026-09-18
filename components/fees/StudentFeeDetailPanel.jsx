'use client';

import { useEffect, useRef, useState } from 'react';
import { FiX, FiPrinter, FiBookOpen } from 'react-icons/fi';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import CollectFeeModal from './CollectFeeModal';
import DiscountModal from './DiscountModal';
import PaymentLedgerModal from './PaymentLedgerModal';
import { TERM_DISPLAY_NAMES, TERM_LABELS } from '@/lib/feeConstants';
import { getStudent, getStudentFees } from '@/lib/api';

function formatCurrency(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

const STATUS_BADGE = {
  PAID: { label: 'Paid', variant: 'green' },
  PARTIAL: { label: 'Partial', variant: 'violet' },
  PENDING: { label: 'Due', variant: 'amber' },
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Renders a printable receipt for one fee (any term with at least some
// payment recorded against it) in a new tab and triggers the browser's
// print dialog on it — no print-CSS on the app's own pages required, and no
// server round-trip. `school` (displayName/logoUrl/address) is optional —
// the receipt still works, just without a header, for any caller that
// hasn't threaded it through yet.
function printReceipt(student, fee, school = {}) {
  const win = window.open('', '_blank');
  if (!win) return;
  const paidAt = fee.payment?.paidAt ? new Date(fee.payment.paidAt) : new Date();
  const paidDate = paidAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const paidTime = paidAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const receiptNo = `RCPT-${fee.id.slice(-8).toUpperCase()}`;
  const schoolName = school.displayName || 'SchoolApp 360';
  const schoolAddress = [school.addressLine1, school.addressLine2].filter(Boolean).join(', ');

  win.document.write(`
    <html>
      <head>
        <title>Receipt — ${escapeHtml(student.firstName)} ${escapeHtml(student.lastName)}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: 'Segoe UI', -apple-system, Arial, sans-serif; color: #1f2937; padding: 0; margin: 0; background: #f3f4f6; }
          .sheet { max-width: 680px; margin: 24px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .band { height: 8px; background: linear-gradient(90deg, #6d28d9, #4f46e5, #2563eb); }
          .header { display: flex; align-items: center; justify-content: space-between; padding: 28px 32px 20px; border-bottom: 1px solid #e5e7eb; }
          .header .brand { display: flex; align-items: center; gap: 12px; }
          .header img { width: 44px; height: 44px; border-radius: 10px; object-fit: cover; }
          .header .brand-name { font-size: 17px; font-weight: 700; color: #111827; }
          .header .brand-address { font-size: 11px; color: #9ca3af; margin-top: 2px; }
          .header .receipt-tag { text-align: right; }
          .header .receipt-tag .label { font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: #9ca3af; font-weight: 600; }
          .header .receipt-tag .value { font-size: 13px; font-weight: 700; color: #4f46e5; font-family: 'Courier New', monospace; }
          .title-row { display: flex; align-items: center; justify-content: space-between; padding: 20px 32px 0; }
          .title-row h1 { font-size: 20px; margin: 0; color: #111827; }
          .badge { font-size: 11px; font-weight: 700; letter-spacing: 0.04em; color: #15803d; background: #dcfce7; padding: 4px 12px; border-radius: 999px; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 24px; padding: 18px 32px 24px; }
          .meta-grid .item .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #9ca3af; font-weight: 600; }
          .meta-grid .item .value { font-size: 13px; color: #1f2937; font-weight: 600; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin: 0 0 4px; }
          thead th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; padding: 10px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; }
          thead th:last-child, td:last-child { text-align: right; }
          tbody td { padding: 10px 32px; font-size: 13px; color: #374151; border-bottom: 1px solid #f3f4f6; }
          .summary { padding: 18px 32px 28px; }
          .summary-row { display: flex; justify-content: space-between; font-size: 13px; color: #6b7280; padding: 5px 0; }
          .summary-row.discount { color: #4f46e5; }
          .summary-row.grand { font-size: 16px; font-weight: 700; color: #111827; border-top: 1px solid #e5e7eb; margin-top: 8px; padding-top: 12px; }
          .footer { text-align: center; padding: 16px 32px 28px; font-size: 11px; color: #9ca3af; }
          @page { size: portrait; }
          @media print { body { background: #fff; } .sheet { box-shadow: none; margin: 0; border-radius: 0; max-width: 100%; } }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="band"></div>
          <div class="header">
            <div class="brand">
              ${school.logoUrl ? `<img src="${escapeHtml(school.logoUrl)}" alt="" />` : ''}
              <div>
                <div class="brand-name">${escapeHtml(schoolName)}</div>
                ${schoolAddress ? `<div class="brand-address">${escapeHtml(schoolAddress)}</div>` : ''}
              </div>
            </div>
            <div class="receipt-tag">
              <div class="label">Receipt No.</div>
              <div class="value">${receiptNo}</div>
            </div>
          </div>

          <div class="title-row">
            <h1>Fee Receipt</h1>
            <span class="badge">PAID</span>
          </div>

          <div class="meta-grid">
            <div class="item">
              <div class="label">Student</div>
              <div class="value">${escapeHtml(student.firstName)} ${escapeHtml(student.lastName)} (${escapeHtml(student.admissionId)})</div>
            </div>
            <div class="item">
              <div class="label">Class</div>
              <div class="value">${escapeHtml(student.class)}${student.section ? ` - ${escapeHtml(student.section)}` : ''}</div>
            </div>
            <div class="item">
              <div class="label">Term</div>
              <div class="value">${escapeHtml(TERM_DISPLAY_NAMES[fee.term] || fee.term)} (${escapeHtml(TERM_LABELS[fee.term] || '')})</div>
            </div>
            <div class="item">
              <div class="label">Paid On</div>
              <div class="value">${paidDate} · ${paidTime}</div>
            </div>
            <div class="item">
              <div class="label">Payment Method</div>
              <div class="value">${escapeHtml(fee.payment?.method || '—')}</div>
            </div>
            <div class="item">
              <div class="label">Transaction ID</div>
              <div class="value" style="font-family:'Courier New',monospace;">${escapeHtml(fee.payment?.transactionId || '—')}</div>
            </div>
          </div>

          <table>
            <thead><tr><th>Fee Item</th><th>Amount</th></tr></thead>
            <tbody>
              ${fee.items.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>₹${item.amount.toLocaleString('en-IN')}</td></tr>`).join('')}
            </tbody>
          </table>

          <div class="summary">
            <div class="summary-row"><span>Total</span><span>₹${fee.totalAmount.toLocaleString('en-IN')}</span></div>
            ${fee.discountAmount > 0 ? `<div class="summary-row discount"><span>Discount${fee.discountReason ? ` (${escapeHtml(fee.discountReason)})` : ''}</span><span>-₹${fee.discountAmount.toLocaleString('en-IN')}</span></div>
            <div class="summary-row"><span>Payable</span><span>₹${fee.payableAmount.toLocaleString('en-IN')}</span></div>` : ''}
            <div class="summary-row grand"><span>Amount Paid</span><span>₹${fee.paidAmount.toLocaleString('en-IN')}</span></div>
          </div>

          <div class="footer">This is a computer-generated receipt and does not require a signature.</div>
        </div>
        <script>
          // Printing right after document.write fires before a large data-URI
          // logo has actually decoded — the print preview would render with
          // the logo slot blank. Wait for this window's own load event (all
          // images included) instead of printing immediately.
          window.onload = function () { window.print(); };
        </script>
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
}

export default function StudentFeeDetailPanel({ studentId, academicSession, autoCollect = false, onClose, onCollected, school }) {
  const [student, setStudent] = useState(null);
  const [fees, setFees] = useState(null);
  const [error, setError] = useState('');
  const [collectTarget, setCollectTarget] = useState(null);
  const [discountTarget, setDiscountTarget] = useState(null);
  const [showLedger, setShowLedger] = useState(false);
  // Only ever auto-opens the Collect popup once per panel-open (a table row's
  // "Collect" button sets `autoCollect` — see StudentFeesExplorer) — reset on
  // every new student, and never re-triggered by a later `fees` update from
  // a *successful* collection, which would otherwise pop the modal right
  // back open for the next unpaid term.
  const autoCollectTriggered = useRef(false);

  useEffect(() => {
    autoCollectTriggered.current = false;
  }, [studentId]);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    setStudent(null);
    setFees(null);
    setError('');
    Promise.all([getStudent(studentId), getStudentFees(studentId, academicSession)])
      .then(([studentData, feesData]) => {
        if (cancelled) return;
        setStudent(studentData);
        setFees(feesData);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, academicSession]);

  useEffect(() => {
    if (!autoCollect || !fees || autoCollectTriggered.current) return;
    autoCollectTriggered.current = true;
    const target = fees.find((f) => f.status !== 'PAID');
    if (target) setCollectTarget(target);
  }, [autoCollect, fees]);

  // Optimistic — collectManualPayment's response already IS the fully
  // updated StudentFee, so splicing it straight into local state gives an
  // instant, backend-confirmed update with no extra round-trip (no refetch
  // of this panel's fees, and no refetch of the table's whole summary
  // aggregate just to reflect one student's one changed row).
  const applyUpdatedFee = (updatedFee, message, onCollectedCb) => {
    const nextFees = (fees || []).map((f) => (f.id === updatedFee.id ? updatedFee : f));
    setFees(nextFees);

    const totalFee = nextFees.reduce((sum, f) => sum + f.payableAmount, 0);
    const paid = nextFees.reduce((sum, f) => sum + f.paidAmount, 0);
    const due = totalFee - paid;
    const feeStatus = totalFee === 0 ? 'NO_FEES' : due <= 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'DUE';

    onCollectedCb?.(studentId, { totalFee, paid, due, feeStatus }, message);
  };

  const handleCollected = (updatedFee, message) => {
    setCollectTarget(null);
    applyUpdatedFee(updatedFee, message, onCollected);
  };

  const handleDiscounted = (updatedFee, message) => {
    setDiscountTarget(null);
    applyUpdatedFee(updatedFee, message, onCollected);
  };

  const totalFee = (fees || []).reduce((sum, f) => sum + f.totalAmount, 0);
  const totalDiscount = (fees || []).reduce((sum, f) => sum + f.discountAmount, 0);
  const totalPaid = (fees || []).reduce((sum, f) => sum + f.paidAmount, 0);
  const totalDue = totalFee - totalDiscount - totalPaid;

  const latestPaidFee = (fees || []).filter((f) => f.paidAmount > 0).slice(-1)[0];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm h-fit sticky top-4">
      <div className="flex items-start justify-between p-5 border-b border-gray-100">
        {student ? (
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex items-center justify-center w-11 h-11 rounded-full bg-indigo-600 text-white font-semibold shrink-0">
              {student.initials}
            </span>
            <div className="min-w-0">
              <p className="text-base font-bold text-gray-900 truncate">
                {student.firstName} {student.lastName}
              </p>
              <p className="text-xs text-gray-400">{student.admissionId}</p>
            </div>
          </div>
        ) : (
          <div className="h-11" />
        )}
        <div className="flex items-center gap-2 shrink-0">
          {student && <Badge label={student.status} variant={student.status === 'Active' ? 'green' : 'gray'} />}
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <FiX className="w-5 h-5" />
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-500 text-center py-8 px-5">{error}</p>}

      {!error && !student && <p className="text-sm text-gray-400 text-center py-10">Loading...</p>}

      {!error && student && (
        <>
          <div className="grid grid-cols-2 gap-4 p-5 border-b border-gray-100">
            <div>
              <p className="text-xs text-gray-400">Class &amp; Section</p>
              <p className="text-sm font-medium text-gray-900 mt-0.5">
                {student.class}{student.section ? ` - ${student.section}` : ''}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Date of Birth</p>
              <p className="text-sm font-medium text-gray-900 mt-0.5">{student.dob || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Parent Name</p>
              <p className="text-sm font-medium text-gray-900 mt-0.5">{student.guardian?.fullName || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Contact No.</p>
              <p className="text-sm font-medium text-gray-900 mt-0.5">{student.guardian?.phone || student.whatsappNumber || '—'}</p>
            </div>
          </div>

          <div className="p-5 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900 mb-3">Fee Summary</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Total Fee</span>
                <span className="text-gray-900 font-medium">{formatCurrency(totalFee)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Discount</span>
                  <span className="text-indigo-600 font-medium">-{formatCurrency(totalDiscount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Paid Amount</span>
                <span className="text-green-600 font-medium">{formatCurrency(totalPaid)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Pending Amount</span>
                <span className="text-amber-600 font-medium">{formatCurrency(totalDue)}</span>
              </div>
            </div>
          </div>

          <div className="p-5 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900 mb-3">Term-wise Details</p>
            {(fees || []).length === 0 ? (
              <p className="text-xs text-gray-400">No fees generated yet for this student.</p>
            ) : (
              <div className="space-y-3">
                {fees.map((fee) => (
                  <div key={fee.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{TERM_LABELS[fee.term]}</p>
                      {fee.discountAmount > 0 ? (
                        <p className="text-xs text-gray-400">
                          <span className="line-through">{formatCurrency(fee.totalAmount)}</span>{' '}
                          <span className="text-indigo-600 font-medium">{formatCurrency(fee.payableAmount)}</span>
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400">{formatCurrency(fee.totalAmount)}</p>
                      )}
                      {fee.discountReason && <p className="text-[11px] text-gray-400">{fee.discountReason}</p>}
                    </div>
                    <div className="text-right">
                      <Badge {...STATUS_BADGE[fee.status]} />
                      {fee.status !== 'PENDING' ? (
                        <p className="text-[11px] text-gray-400 mt-1">{fee.createdAt}</p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setCollectTarget(fee)}
                          className="text-xs font-medium text-indigo-700 hover:text-indigo-800 cursor-pointer mt-1"
                        >
                          Collect
                        </button>
                      )}
                      {fee.status !== 'PAID' && (
                        <button
                          type="button"
                          onClick={() => setDiscountTarget(fee)}
                          className="block text-xs font-medium text-gray-400 hover:text-gray-600 cursor-pointer mt-0.5"
                        >
                          {fee.discountAmount > 0 ? 'Edit Discount' : 'Add Discount'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-5 space-y-2">
            <Button
              label="Collect Payment"
              onClick={() => setCollectTarget((fees || []).find((f) => f.status !== 'PAID') || null)}
              disabled={!(fees || []).some((f) => f.status !== 'PAID')}
              fullWidth
            />
            <div className="grid grid-cols-2 gap-2">
              <Button
                label="Print Receipt"
                variant="secondary"
                icon={<FiPrinter className="w-4 h-4" />}
                onClick={() => latestPaidFee && printReceipt(student, latestPaidFee, school)}
                disabled={!latestPaidFee}
              />
              <Button
                label="View Ledger"
                variant="secondary"
                icon={<FiBookOpen className="w-4 h-4" />}
                onClick={() => setShowLedger(true)}
              />
            </div>
          </div>
        </>
      )}

      <CollectFeeModal
        isOpen={Boolean(collectTarget)}
        onClose={() => setCollectTarget(null)}
        fee={collectTarget}
        studentName={student ? `${student.firstName} ${student.lastName}` : ''}
        onSuccess={handleCollected}
      />

      <DiscountModal
        isOpen={Boolean(discountTarget)}
        onClose={() => setDiscountTarget(null)}
        fee={discountTarget}
        studentName={student ? `${student.firstName} ${student.lastName}` : ''}
        onSuccess={handleDiscounted}
      />

      <PaymentLedgerModal
        isOpen={showLedger}
        onClose={() => setShowLedger(false)}
        studentId={studentId}
        studentName={student ? `${student.firstName} ${student.lastName}` : ''}
      />
    </div>
  );
}
