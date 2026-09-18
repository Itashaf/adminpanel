'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Modal from '@/components/Modal';
import Input from '@/components/Input';
import DatePicker from '@/components/DatePicker';
import Button from '@/components/Button';
import StatusPill from './StatusPill';
import { academicSessionSchema } from '@/lib/schemas';
import { suggestSessionName } from '@/lib/sessionUtils';
import { createAcademicSession, updateAcademicSession } from '@/lib/api';

const EMPTY_VALUES = { name: '', startDate: '', endDate: '', description: '' };

export default function SessionFormModal({ isOpen, onClose, session, onSuccess }) {
  const isEdit = Boolean(session);
  const [formError, setFormError] = useState('');
  const [nameTouched, setNameTouched] = useState(false);

  const {
    handleSubmit,
    watch,
    control,
    register,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(academicSessionSchema),
    defaultValues: EMPTY_VALUES,
  });

  const startDate = watch('startDate');
  const name = watch('name');

  useEffect(() => {
    if (!isOpen) return;
    reset(
      isEdit
        ? {
            name: session.name,
            startDate: session.startDate,
            endDate: session.endDate,
            description: session.description || '',
          }
        : EMPTY_VALUES
    );
    setNameTouched(isEdit);
    setFormError('');
  }, [isOpen, isEdit, session, reset]);

  useEffect(() => {
    if (nameTouched) return;
    setValue('name', suggestSessionName(startDate));
  }, [startDate, nameTouched, setValue]);

  const handleClose = () => {
    setFormError('');
    onClose();
  };

  const onSubmit = async (data) => {
    setFormError('');
    try {
      if (isEdit) {
        await updateAcademicSession(session.id, data);
      } else {
        await createAcademicSession(data);
      }
      onSuccess?.(isEdit ? 'Academic session updated successfully.' : 'Academic session created successfully.');
    } catch (err) {
      setFormError(err.message);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Edit Academic Session' : 'Create Academic Session'}
      description={isEdit ? "Update this session's dates and details." : 'Set up a new academic year for your school.'}
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      footer={
        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <div className="w-full sm:w-auto">
            <Button label="Cancel" type="button" variant="secondary" onClick={handleClose} fullWidth />
          </div>
          <Button
            type="submit"
            form="session-form"
            label={isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Session'}
            disabled={isSubmitting}
          />
        </div>
      }
    >
      <form id="session-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 py-1">
        {formError && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{formError}</p>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Session Name <span className="text-red-500">*</span>
          </label>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <Input
                value={field.value || ''}
                onChange={(e) => {
                  setNameTouched(true);
                  field.onChange(e.target.value);
                }}
                placeholder="e.g. 2026-27"
                error={errors.name?.message}
              />
            )}
          />
          <p className="text-xs text-gray-400 mt-1.5">Generated automatically from the dates below — edit if needed.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date <span className="text-red-500">*</span>
            </label>
            <Controller
              name="startDate"
              control={control}
              render={({ field }) => (
                <DatePicker value={field.value} onChange={field.onChange} error={errors.startDate?.message} />
              )}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date <span className="text-red-500">*</span>
            </label>
            <Controller
              name="endDate"
              control={control}
              render={({ field }) => (
                <DatePicker value={field.value} onChange={field.onChange} error={errors.endDate?.message} />
              )}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            {...register('description')}
            rows={3}
            placeholder={`Academic session for ${name || '20XX-XX'}`}
            className="w-full py-2.5 px-4 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-400">Status</p>
          <StatusPill status={isEdit ? session.status : 'Upcoming'} />
        </div>
        {!isEdit && (
          <p className="text-xs text-gray-400">
            New sessions start as Upcoming. You can set this session as active after it&apos;s created.
          </p>
        )}
      </form>
    </Modal>
  );
}
