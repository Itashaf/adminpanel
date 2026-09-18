'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FiSliders, FiClock, FiDollarSign, FiCalendar, FiHash } from 'react-icons/fi';
import Input from '@/components/Input';
import Dropdown from '@/components/Dropdown';
import Toast from '@/components/Toast';
import SettingsActionBar from './SettingsActionBar';
import { schoolPreferencesSchema } from '@/lib/schemas';
import { updateSchoolPreferences } from '@/lib/api';
import { TIMEZONE_OPTIONS, CURRENCY_OPTIONS, DATE_FORMAT_OPTIONS } from '@/lib/schoolConstants';

export default function PreferencesForm({ school }) {
  const [formError, setFormError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const {
    handleSubmit,
    control,
    register,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(schoolPreferencesSchema),
    defaultValues: {
      timezone: school.timezone,
      currency: school.currency,
      dateFormat: school.dateFormat,
      studentIdPrefix: school.studentIdPrefix,
      teacherIdPrefix: school.teacherIdPrefix,
    },
  });

  const onSubmit = async (data) => {
    setFormError('');
    try {
      const updated = await updateSchoolPreferences(data);
      reset({
        timezone: updated.timezone,
        currency: updated.currency,
        dateFormat: updated.dateFormat,
        studentIdPrefix: updated.studentIdPrefix,
        teacherIdPrefix: updated.teacherIdPrefix,
      });
      setToastMessage('School settings updated successfully.');
    } catch (err) {
      setFormError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
      <div className="flex items-center gap-4 mb-6">
        <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-violet-100 text-violet-600 shrink-0">
          <FiSliders className="w-5 h-5" />
        </span>
        <div>
          <h3 className="text-lg font-bold text-gray-900">System Preferences</h3>
          <p className="text-sm text-gray-500 mt-0.5">Configure regional defaults and ID conventions.</p>
        </div>
      </div>

      {formError && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-4">{formError}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
          <Controller
            name="timezone"
            control={control}
            render={({ field }) => (
              <Dropdown
                icon={<FiClock className="w-4 h-4" />}
                options={TIMEZONE_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                error={errors.timezone?.message}
              />
            )}
          />
          <p className="text-xs text-gray-400 mt-1.5">Used for attendance, timetables and reports.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
          <Controller
            name="currency"
            control={control}
            render={({ field }) => (
              <Dropdown
                icon={<FiDollarSign className="w-4 h-4" />}
                options={CURRENCY_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                error={errors.currency?.message}
              />
            )}
          />
          <p className="text-xs text-gray-400 mt-1.5">Used across fee and finance modules.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
          <Controller
            name="dateFormat"
            control={control}
            render={({ field }) => (
              <Dropdown
                icon={<FiCalendar className="w-4 h-4" />}
                options={DATE_FORMAT_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                error={errors.dateFormat?.message}
              />
            )}
          />
        </div>

        <div />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Student ID Prefix</label>
          <Input placeholder="e.g. STD" icon={<FiHash />} error={errors.studentIdPrefix?.message} {...register('studentIdPrefix')} />
          <p className="text-xs text-gray-400 mt-1.5">Used for auto-generated admission numbers, e.g. STD-2026-0001.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Teacher ID Prefix</label>
          <Input placeholder="e.g. TCH" icon={<FiHash />} error={errors.teacherIdPrefix?.message} {...register('teacherIdPrefix')} />
          <p className="text-xs text-gray-400 mt-1.5">Used for auto-generated employee IDs, e.g. TCH-2026-0001.</p>
        </div>
      </div>

      <SettingsActionBar onCancel={() => reset()} isSubmitting={isSubmitting} isDirty={isDirty} />

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </form>
  );
}
