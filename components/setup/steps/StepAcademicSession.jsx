'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FiInfo } from 'react-icons/fi';
import Input from '@/components/Input';
import DatePicker from '@/components/DatePicker';
import Button from '@/components/Button';
import { setupAcademicSessionSchema } from '@/lib/schemas';
import { suggestSessionName } from '@/lib/sessionUtils';

export default function StepAcademicSession({ defaultValues, onBack, onContinue, submitError }) {
  const [nameTouched, setNameTouched] = useState(Boolean(defaultValues.sessionName));

  const {
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(setupAcademicSessionSchema),
    defaultValues: {
      sessionName: defaultValues.sessionName,
      startDate: defaultValues.startDate,
      endDate: defaultValues.endDate,
    },
  });

  const startDate = watch('startDate');

  useEffect(() => {
    if (nameTouched) return;
    setValue('sessionName', suggestSessionName(startDate));
  }, [startDate, nameTouched, setValue]);

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900">Academic Session</h2>
      <p className="text-sm text-gray-500 mt-1 mb-6">Set up the academic year your school will start with.</p>

      <form onSubmit={handleSubmit(onContinue)} noValidate className="space-y-4">
        {submitError && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{submitError}</p>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Academic Session <span className="text-red-500">*</span>
          </label>
          <Controller
            name="sessionName"
            control={control}
            render={({ field }) => (
              <Input
                placeholder="e.g. 2026-27"
                value={field.value || ''}
                onChange={(e) => {
                  setNameTouched(true);
                  field.onChange(e.target.value);
                }}
                error={errors.sessionName?.message}
              />
            )}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date <span className="text-red-500">*</span>
            </label>
            <Controller
              name="startDate"
              control={control}
              render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} error={errors.startDate?.message} />}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date <span className="text-red-500">*</span>
            </label>
            <Controller
              name="endDate"
              control={control}
              render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} error={errors.endDate?.message} />}
            />
          </div>
        </div>

        <p className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-4 py-3">
          <FiInfo className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
          This will become your school&apos;s first academic session.
        </p>

        <div className="flex gap-3 pt-2">
          <Button type="button" label="Back" variant="secondary" onClick={onBack} />
          <div className="flex-1">
            <Button type="submit" label={isSubmitting ? 'Creating...' : 'Create School'} disabled={isSubmitting} fullWidth />
          </div>
        </div>
      </form>
    </div>
  );
}
