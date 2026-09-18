'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FiClock } from 'react-icons/fi';
import Dropdown from '@/components/Dropdown';
import Toast from '@/components/Toast';
import SettingsActionBar from './SettingsActionBar';
import { attendanceSettingsSchema } from '@/lib/schemas';
import { updateAttendanceSettings } from '@/lib/api';

function formatTimeLabel(hour, minute) {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(displayHour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period}`;
}

const TIME_OPTIONS = [];
for (let hour = 7; hour <= 18; hour++) {
  for (const minute of [0, 30]) {
    const value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    TIME_OPTIONS.push({ value, label: formatTimeLabel(hour, minute) });
  }
}

const GRACE_PERIOD_OPTIONS = [15, 30, 45, 60, 90, 120].map((minutes) => ({
  value: String(minutes),
  label: minutes < 60 ? `${minutes} minutes` : `${minutes / 60} hour${minutes > 60 ? 's' : ''}`,
}));

export default function AttendanceRulesForm({ school }) {
  const [formError, setFormError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(attendanceSettingsSchema),
    defaultValues: {
      attendanceDeadlineTime: school.attendanceDeadlineTime,
      attendanceEditGraceMinutes: String(school.attendanceEditGraceMinutes),
    },
  });

  const onSubmit = async (data) => {
    setFormError('');
    try {
      const updated = await updateAttendanceSettings(data);
      reset({
        attendanceDeadlineTime: updated.attendanceDeadlineTime,
        attendanceEditGraceMinutes: String(updated.attendanceEditGraceMinutes),
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
          <FiClock className="w-5 h-5" />
        </span>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Attendance Rules</h3>
          <p className="text-sm text-gray-500 mt-0.5">Control when teachers can mark and edit attendance.</p>
        </div>
      </div>

      {formError && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-4">{formError}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Daily Attendance Deadline</label>
          <Controller
            name="attendanceDeadlineTime"
            control={control}
            render={({ field }) => (
              <Dropdown icon={<FiClock className="w-4 h-4" />} options={TIME_OPTIONS} value={field.value} onChange={field.onChange} error={errors.attendanceDeadlineTime?.message} />
            )}
          />
          <p className="text-xs text-gray-400 mt-1.5">Teachers can only mark today's attendance before this time. Admins are never restricted.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Edit Grace Period</label>
          <Controller
            name="attendanceEditGraceMinutes"
            control={control}
            render={({ field }) => (
              <Dropdown icon={<FiClock className="w-4 h-4" />} options={GRACE_PERIOD_OPTIONS} value={field.value} onChange={field.onChange} error={errors.attendanceEditGraceMinutes?.message} />
            )}
          />
          <p className="text-xs text-gray-400 mt-1.5">How long a teacher can edit attendance after saving it, before it locks.</p>
        </div>
      </div>

      <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-4 py-3 mt-5">
        Once a teacher's edit window has closed, an admin can unlock that specific day's attendance from the Daily Attendance page —
        or edit it directly themselves, anytime.
      </p>

      <SettingsActionBar onCancel={() => reset()} isSubmitting={isSubmitting} isDirty={isDirty} />

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </form>
  );
}
