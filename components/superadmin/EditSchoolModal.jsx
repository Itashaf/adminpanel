'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FiHome, FiHash, FiUser, FiMail, FiPhone } from 'react-icons/fi';
import Modal from '@/components/Modal';
import Input from '@/components/Input';
import Dropdown from '@/components/Dropdown';
import Button from '@/components/Button';
import { editSchoolInfoSchema } from '@/lib/schemas';
import { updateSchoolDirectory } from '@/lib/api';
import { getIndianStates, getCitiesForState, getStateCodeByName, getNationalityOptions } from '@/lib/location';

const INDIAN_STATES = getIndianStates();
const COUNTRY_OPTIONS = getNationalityOptions();

export default function EditSchoolModal({ isOpen, onClose, school, onSuccess }) {
  const [formError, setFormError] = useState('');
  const [selectedStateCode, setSelectedStateCode] = useState('');

  const {
    handleSubmit,
    control,
    register,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(editSchoolInfoSchema) });

  useEffect(() => {
    if (!isOpen || !school) return;
    reset({
      name: school.name,
      code: school.code,
      principalName: school.principalName || '',
      email: school.email,
      phone: school.phone,
      city: school.city || '',
      state: school.state || '',
      country: school.country || '',
    });
    setSelectedStateCode(getStateCodeByName(school.state));
    setFormError('');
  }, [isOpen, school, reset]);

  const cityOptions = getCitiesForState(selectedStateCode);

  const handleClose = () => {
    setFormError('');
    onClose();
  };

  const onSubmit = async (data) => {
    setFormError('');
    try {
      await updateSchoolDirectory(school.id, data);
      onSuccess?.('School info updated successfully.');
    } catch (err) {
      setFormError(err.message);
    }
  };

  return (
    <Modal
      title="Edit School Info"
      description="Update this school's profile and contact details."
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      footer={
        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <div className="w-full sm:w-auto">
            <Button label="Cancel" type="button" variant="secondary" onClick={handleClose} fullWidth />
          </div>
          <Button type="submit" form="edit-school-form" label={isSubmitting ? 'Saving...' : 'Save Changes'} disabled={isSubmitting} />
        </div>
      }
    >
      <form id="edit-school-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 py-1">
        {formError && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{formError}</p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              School Name <span className="text-red-500">*</span>
            </label>
            <Input icon={<FiHome />} error={errors.name?.message} {...register('name')} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              School Code <span className="text-red-500">*</span>
            </label>
            <Input icon={<FiHash />} error={errors.code?.message} {...register('code')} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Principal Name</label>
          <Input icon={<FiUser />} error={errors.principalName?.message} {...register('principalName')} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <Input type="email" icon={<FiMail />} error={errors.email?.message} {...register('email')} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone <span className="text-red-500">*</span>
            </label>
            <Input icon={<FiPhone />} error={errors.phone?.message} {...register('phone')} />
          </div>
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
          <div className="sm:col-span-2">
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
        </div>
      </form>
    </Modal>
  );
}
