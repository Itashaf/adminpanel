'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FiMapPin } from 'react-icons/fi';
import Input from '@/components/Input';
import Dropdown from '@/components/Dropdown';
import Toast from '@/components/Toast';
import SettingsActionBar from './SettingsActionBar';
import { schoolContactSchema } from '@/lib/schemas';
import { updateSchoolContact } from '@/lib/api';
import { getIndianStates, getCitiesForState, getStateCodeByName, getNationalityOptions } from '@/lib/location';

const INDIAN_STATES = getIndianStates();
const COUNTRY_OPTIONS = getNationalityOptions();

export default function ContactAddressForm({ school }) {
  const [formError, setFormError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [selectedStateCode, setSelectedStateCode] = useState(() => getStateCodeByName(school.state));

  const {
    handleSubmit,
    control,
    register,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(schoolContactSchema),
    defaultValues: {
      addressLine1: school.addressLine1,
      addressLine2: school.addressLine2 || '',
      city: school.city,
      state: school.state,
      country: school.country,
      pinCode: school.pinCode,
    },
  });

  const cityOptions = getCitiesForState(selectedStateCode);

  const onSubmit = async (data) => {
    setFormError('');
    try {
      const updated = await updateSchoolContact(data);
      reset({
        addressLine1: updated.addressLine1,
        addressLine2: updated.addressLine2 || '',
        city: updated.city,
        state: updated.state,
        country: updated.country,
        pinCode: updated.pinCode,
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
          <FiMapPin className="w-5 h-5" />
        </span>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Contact &amp; Address</h3>
          <p className="text-sm text-gray-500 mt-0.5">Where your school is located.</p>
        </div>
      </div>

      {formError && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-4">{formError}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Address Line 1 <span className="text-red-500">*</span>
          </label>
          <Input placeholder="Street address" error={errors.addressLine1?.message} {...register('addressLine1')} />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 2</label>
          <Input placeholder="Apartment, landmark, etc." error={errors.addressLine2?.message} {...register('addressLine2')} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Country <span className="text-red-500">*</span>
          </label>
          <Controller
            name="country"
            control={control}
            render={({ field }) => (
              <Dropdown
                placeholder="Select country"
                options={COUNTRY_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                error={errors.country?.message}
                searchable
              />
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            State <span className="text-red-500">*</span>
          </label>
          <Controller
            name="state"
            control={control}
            render={({ field }) => (
              <Dropdown
                placeholder="Select state"
                options={INDIAN_STATES}
                value={selectedStateCode}
                onChange={(isoCode) => {
                  setSelectedStateCode(isoCode);
                  const state = INDIAN_STATES.find((option) => option.value === isoCode);
                  field.onChange(state?.label || '');
                }}
                error={errors.state?.message}
                searchable
              />
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            City <span className="text-red-500">*</span>
          </label>
          <Controller
            name="city"
            control={control}
            render={({ field }) => (
              <Dropdown
                placeholder={selectedStateCode ? 'Select city' : 'Select a state first'}
                options={cityOptions}
                value={field.value}
                onChange={field.onChange}
                error={errors.city?.message}
                disabled={!selectedStateCode}
                searchable
              />
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            PIN Code <span className="text-red-500">*</span>
          </label>
          <Input placeholder="e.g. 411001" error={errors.pinCode?.message} {...register('pinCode')} />
        </div>
      </div>

      <SettingsActionBar onCancel={() => reset()} isSubmitting={isSubmitting} isDirty={isDirty} />

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </form>
  );
}
