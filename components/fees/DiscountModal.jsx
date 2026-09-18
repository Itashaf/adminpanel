'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Modal from '@/components/Modal';
import Input from '@/components/Input';
import Button from '@/components/Button';
import Dropdown from '@/components/Dropdown';
import { discountSchema } from '@/lib/schemas';
import { applyFeeDiscount, removeFeeDiscount } from '@/lib/api';

const TYPE_OPTIONS = [
  { value: 'FIXED', label: 'Fixed Amount (₹)' },
  { value: 'PERCENT', label: 'Percentage (%)' },
];

function formatCurrency(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

// A discount can only ever be applied down to what's already been paid, not
// below it — lib/fees.js's applyFeeDiscount rejects anything that would put
// the fee record into an owes-less-than-it-already-received state (that's a
// refund, out of scope here), so this just surfaces that same error rather
// than trying to re-derive the limit client-side.
export default function DiscountModal({ isOpen, onClose, fee, studentName, onSuccess }) {
  const [formError, setFormError] = useState('');
  const [isRemoving, setIsRemoving] = useState(false);
  const hasDiscount = Boolean(fee?.discountType);

  const {
    handleSubmit,
    control,
    register,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(discountSchema),
    defaultValues: { discountType: 'FIXED', discountValue: '', discountReason: '' },
  });

  useEffect(() => {
    if (!isOpen || !fee) return;
    reset({
      discountType: fee.discountType || 'FIXED',
      discountValue: fee.discountValue ? String(fee.discountValue) : '',
      discountReason: fee.discountReason || '',
    });
    setFormError('');
  }, [isOpen, fee, reset]);

  const handleClose = () => {
    setFormError('');
    onClose();
  };

  const onSubmit = async (data) => {
    setFormError('');
    try {
      const updatedFee = await applyFeeDiscount(fee.id, data);
      onSuccess?.(updatedFee, `Discount applied for ${studentName}.`);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleRemove = async () => {
    setFormError('');
    setIsRemoving(true);
    try {
      const updatedFee = await removeFeeDiscount(fee.id);
      onSuccess?.(updatedFee, `Discount removed for ${studentName}.`);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <Modal
      title={hasDiscount ? 'Edit Discount' : 'Apply Discount'}
      description={fee ? `${studentName} — ${fee.term} (Total: ${formatCurrency(fee.totalAmount)})` : ''}
      isOpen={isOpen}
      onClose={handleClose}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {formError && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{formError}</p>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Discount Type <span className="text-red-500">*</span>
          </label>
          <Controller
            name="discountType"
            control={control}
            render={({ field }) => (
              <Dropdown options={TYPE_OPTIONS} value={field.value} onChange={field.onChange} error={errors.discountType?.message} />
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Discount Value <span className="text-red-500">*</span>
          </label>
          <Input {...register('discountValue')} inputMode="numeric" placeholder="e.g. 500" error={errors.discountValue?.message} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Reason (optional)</label>
          <Input {...register('discountReason')} placeholder="e.g. Sibling discount, scholarship" />
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
          {hasDiscount && (
            <div className="w-full sm:w-auto sm:mr-auto">
              <Button
                label={isRemoving ? 'Removing...' : 'Remove Discount'}
                type="button"
                variant="secondary"
                onClick={handleRemove}
                disabled={isRemoving || isSubmitting}
                fullWidth
              />
            </div>
          )}
          <div className="w-full sm:w-auto">
            <Button label="Cancel" type="button" variant="secondary" onClick={handleClose} fullWidth />
          </div>
          <Button
            type="submit"
            label={isSubmitting ? 'Saving...' : hasDiscount ? 'Update Discount' : 'Apply Discount'}
            disabled={isSubmitting || isRemoving}
            fullWidth={false}
          />
        </div>
      </form>
    </Modal>
  );
}
