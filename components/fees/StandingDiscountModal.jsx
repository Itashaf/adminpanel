'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Modal from '@/components/Modal';
import Input from '@/components/Input';
import Button from '@/components/Button';
import Dropdown from '@/components/Dropdown';
import { discountSchema } from '@/lib/schemas';
import { setStandingDiscount, removeStandingDiscount } from '@/lib/api';

const TYPE_OPTIONS = [
  { value: 'FIXED', label: 'Fixed Amount (₹)' },
  { value: 'PERCENT', label: 'Percentage (%)' },
];

// Sets a recurring discount on the student itself (sibling, staff-child,
// etc.) — see the Student model's discountType comment for how this differs
// from components/fees/DiscountModal.jsx's one-off per-term discount: this
// one is a template lib/fees.js's generateStudentFees copies onto every
// future term automatically, not something that touches already-generated
// fees on its own (that's the separate "Apply to Pending Fees" action).
export default function StandingDiscountModal({ isOpen, onClose, student, onSuccess }) {
  const [formError, setFormError] = useState('');
  const [isRemoving, setIsRemoving] = useState(false);
  const hasDiscount = Boolean(student?.discountType);

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
    if (!isOpen || !student) return;
    reset({
      discountType: student.discountType || 'FIXED',
      discountValue: student.discountValue ? String(student.discountValue) : '',
      discountReason: student.discountReason || '',
    });
    setFormError('');
  }, [isOpen, student, reset]);

  const handleClose = () => {
    setFormError('');
    onClose();
  };

  const onSubmit = async (data) => {
    setFormError('');
    try {
      const result = await setStandingDiscount(student.id, data);
      onSuccess?.(result, 'Standing discount saved — it will apply to every future term automatically.');
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleRemove = async () => {
    setFormError('');
    setIsRemoving(true);
    try {
      const result = await removeStandingDiscount(student.id);
      onSuccess?.(result, 'Standing discount removed.');
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <Modal
      title={hasDiscount ? 'Edit Standing Discount' : 'Set Standing Discount'}
      description="Applies automatically to every new term generated for this student — e.g. a sibling or staff-child discount."
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
          <Input {...register('discountValue')} inputMode="numeric" placeholder="e.g. 10" error={errors.discountValue?.message} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Reason (optional)</label>
          <Input {...register('discountReason')} placeholder="e.g. Sibling discount, staff child" />
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
          {hasDiscount && (
            <div className="w-full sm:w-auto sm:mr-auto">
              <Button
                label={isRemoving ? 'Removing...' : 'Remove'}
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
          <Button type="submit" label={isSubmitting ? 'Saving...' : 'Save'} disabled={isSubmitting || isRemoving} fullWidth={false} />
        </div>
      </form>
    </Modal>
  );
}
