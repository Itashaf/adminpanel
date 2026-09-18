'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Input from '@/components/Input';
import Button from '@/components/Button';
import LogoUploader from '@/components/settings/LogoUploader';
import ColorPickerField from '@/components/settings/ColorPickerField';
import BrandingPreview from '@/components/settings/BrandingPreview';
import { setupBrandingSchema } from '@/lib/schemas';

export default function StepBranding({ defaultValues, onBack, onContinue }) {
  const {
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(setupBrandingSchema),
    defaultValues: {
      displayName: defaultValues.displayName || defaultValues.name || '',
      logoUrl: defaultValues.logoUrl,
      primaryColor: defaultValues.primaryColor,
      secondaryColor: defaultValues.secondaryColor,
    },
  });

  const preview = watch();

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900">Branding</h2>
      <p className="text-sm text-gray-500 mt-1 mb-6">Give your school a recognizable identity in the app.</p>

      <form onSubmit={handleSubmit(onContinue)} noValidate className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">School Logo</label>
          <Controller
            name="logoUrl"
            control={control}
            render={({ field }) => <LogoUploader value={field.value} onChange={field.onChange} error={errors.logoUrl?.message} />}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">School Display Name</label>
          <Controller
            name="displayName"
            control={control}
            render={({ field }) => (
              <Input placeholder="e.g. ABC Public School" value={field.value} onChange={field.onChange} error={errors.displayName?.message} />
            )}
          />
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

        <div className="flex gap-3 pt-2">
          <Button type="button" label="Back" variant="secondary" onClick={onBack} />
          <div className="flex-1">
            <Button type="submit" label="Continue" fullWidth />
          </div>
        </div>
      </form>
    </div>
  );
}
