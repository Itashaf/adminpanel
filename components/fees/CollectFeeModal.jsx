'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Modal from '@/components/Modal';
import Input from '@/components/Input';
import Button from '@/components/Button';
import Dropdown from '@/components/Dropdown';
import { manualPaymentSchema } from '@/lib/schemas';
import { collectManualPayment } from '@/lib/api';

const METHOD_OPTIONS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
];

function formatCurrency(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

// Manual (cash/UPI/bank transfer) collection only — RAZORPAY is a separate,
// online-only flow, not offered here. See lib/fees.js's collectManualPayment
// for why this rejects that method server-side too. Defaults the amount to
// the full remaining due, but an admin can lower it to record a partial
// payment — collectManualPayment tops up paidAmount and only flips the fee
// to PAID once the running total actually reaches totalAmount.
export default function CollectFeeModal({ isOpen, onClose, fee, studentName, onSuccess }) {
  const [formError, setFormError] = useState('');
  const remainingDue = fee ? fee.payableAmount - fee.paidAmount : 0;

  const {
    handleSubmit,
    control,
    register,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(manualPaymentSchema), defaultValues: { studentFeeId: '', method: 'CASH', amount: '' } });

  useEffect(() => {
    if (!isOpen || !fee) return;
    reset({ studentFeeId: fee.id, method: 'CASH', amount: String(fee.payableAmount - fee.paidAmount) });
    setFormError('');
  }, [isOpen, fee, reset]);

  const handleClose = () => {
    setFormError('');
    onClose();
  };

  const onSubmit = async (data) => {
    setFormError('');
    if (Number(data.amount) > remainingDue) {
      setFormError(`Amount cannot exceed the remaining due (${formatCurrency(remainingDue)}).`);
      return;
    }
    try {
      const result = await collectManualPayment(data.studentFeeId, data.method, data.amount);
      const isPartial = result.studentFee.status === 'PARTIAL';
      onSuccess?.(
        result.studentFee,
        `Collected ${formatCurrency(result.payment.amount)} from ${studentName}${isPartial ? ' (partial payment)' : ''}.`
      );
    } catch (err) {
      setFormError(err.message);
    }
  };

  return (
    <Modal
      title="Collect Fee"
      description={fee ? `${studentName} — ${fee.term} (Due: ${formatCurrency(remainingDue)})` : ''}
      isOpen={isOpen}
      onClose={handleClose}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {formError && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{formError}</p>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount <span className="text-red-500">*</span>
          </label>
          <Input {...register('amount')} inputMode="numeric" placeholder="Amount" error={errors.amount?.message} />
          <p className="text-xs text-gray-400 mt-1.5">
            Full due is {formatCurrency(remainingDue)} — lower this to collect a partial payment.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Method <span className="text-red-500">*</span>
          </label>
          <Controller
            name="method"
            control={control}
            render={({ field }) => (
              <Dropdown
                options={METHOD_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                placeholder="Select payment method"
                error={errors.method?.message}
              />
            )}
          />
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
          <div className="w-full sm:w-auto">
            <Button label="Cancel" type="button" variant="secondary" onClick={handleClose} fullWidth />
          </div>
          <Button type="submit" label={isSubmitting ? 'Collecting...' : 'Collect Fee'} disabled={isSubmitting} fullWidth={false} />
        </div>
      </form>
    </Modal>
  );
}
