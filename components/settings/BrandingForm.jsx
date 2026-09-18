'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FiImage } from 'react-icons/fi';
import Input from '@/components/Input';
import Toast from '@/components/Toast';
import SettingsActionBar from './SettingsActionBar';
import LogoUploader from './LogoUploader';
import ColorPickerField from './ColorPickerField';
import BrandingPreview from './BrandingPreview';
import { schoolBrandingSchema } from '@/lib/schemas';
import { updateSchoolBranding } from '@/lib/api';

export default function BrandingForm({ school }) {
  const [formError, setFormError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const {
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(schoolBrandingSchema),
    defaultValues: {
      displayName: school.displayName,
      logoUrl: school.logoUrl || '',
      primaryColor: school.primaryColor || '',
      secondaryColor: school.secondaryColor || '',
    },
  });

  const preview = watch();

  const onSubmit = async (data) => {
    setFormError('');
    try {
      const updated = await updateSchoolBranding(data);
      reset({
        displayName: updated.displayName,
        logoUrl: updated.logoUrl || '',
        primaryColor: updated.primaryColor || '',
        secondaryColor: updated.secondaryColor || '',
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
          <FiImage className="w-5 h-5" />
        </span>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Branding</h3>
          <p className="text-sm text-gray-500 mt-0.5">Customize how your school appears across the platform.</p>
        </div>
      </div>

      {formError && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-4">{formError}</p>
      )}

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">School Logo</label>
          <Controller
            name="logoUrl"
            control={control}
            render={({ field }) => <LogoUploader value={field.value} onChange={field.onChange} error={errors.logoUrl?.message} />}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              School Display Name <span className="text-red-500">*</span>
            </label>
            <Controller
              name="displayName"
              control={control}
              render={({ field }) => (
                <Input placeholder="e.g. ABC Public School" value={field.value} onChange={field.onChange} error={errors.displayName?.message} />
              )}
            />
            <p className="text-xs text-gray-400 mt-1.5">Shown in the sidebar, header and printed documents.</p>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">Theme Colors <span className="text-gray-400 font-normal">(optional)</span></p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Controller
              name="primaryColor"
              control={control}
              render={({ field }) => (
                <ColorPickerField label="Primary Color" value={field.value} onChange={field.onChange} error={errors.primaryColor?.message} defaultColor="#4338CA" />
              )}
            />
            <Controller
              name="secondaryColor"
              control={control}
              render={({ field }) => (
                <ColorPickerField label="Secondary Color" value={field.value} onChange={field.onChange} error={errors.secondaryColor?.message} defaultColor="#2563EB" />
              )}
            />
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <BrandingPreview
            logoUrl={preview.logoUrl}
            displayName={preview.displayName}
            primaryColor={preview.primaryColor}
            secondaryColor={preview.secondaryColor}
          />
        </div>
      </div>

      <SettingsActionBar onCancel={() => reset()} isSubmitting={isSubmitting} isDirty={isDirty} />

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </form>
  );
}
