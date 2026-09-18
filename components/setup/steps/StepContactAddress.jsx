'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FiMail, FiPhone } from 'react-icons/fi';
import Input from '@/components/Input';
import Dropdown from '@/components/Dropdown';
import Button from '@/components/Button';
import { setupContactSchema } from '@/lib/schemas';
import { getIndianStates, getCitiesForState, getStateCodeByName, getNationalityOptions } from '@/lib/location';

const INDIAN_STATES = getIndianStates();
const COUNTRY_OPTIONS = getNationalityOptions();

export default function StepContactAddress({ defaultValues, onBack, onContinue }) {
  const [selectedStateCode, setSelectedStateCode] = useState(() => getStateCodeByName(defaultValues.state));

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(setupContactSchema),
    defaultValues: {
      email: defaultValues.email,
      phone: defaultValues.phone,
      addressLine1: defaultValues.addressLine1,
      city: defaultValues.city,
      state: defaultValues.state,
      country: defaultValues.country,
      pinCode: defaultValues.pinCode,
    },
  });

  const cityOptions = getCitiesForState(selectedStateCode);

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900">Contact &amp; Address</h2>
      <p className="text-sm text-gray-500 mt-1 mb-6">How can your school be reached?</p>

      <form onSubmit={handleSubmit(onContinue)} noValidate className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              School Email <span className="text-red-500">*</span>
            </label>
            <Input type="email" placeholder="info@yourschool.edu" icon={<FiMail />} error={errors.email?.message} {...register('email')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              School Phone <span className="text-red-500">*</span>
            </label>
            <Input placeholder="+91 98765 43210" icon={<FiPhone />} error={errors.phone?.message} {...register('phone')} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
          <Input placeholder="Street address" error={errors.addressLine1?.message} {...register('addressLine1')} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
            <Controller
              name="country"
              control={control}
              render={({ field }) => (
                <Dropdown placeholder="Select country" options={COUNTRY_OPTIONS} value={field.value} onChange={field.onChange} searchable />
              )}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
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
                  searchable
                />
              )}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
            <Controller
              name="city"
              control={control}
              render={({ field }) => (
                <Dropdown
                  placeholder={selectedStateCode ? 'Select city' : 'Select a state first'}
                  options={cityOptions}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={!selectedStateCode}
                  searchable
                />
              )}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">PIN Code</label>
            <Input placeholder="e.g. 411001" error={errors.pinCode?.message} {...register('pinCode')} />
          </div>
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
