'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FiHome, FiMail, FiPhone, FiGlobe, FiHash, FiUser } from 'react-icons/fi';
import Input from '@/components/Input';
import Toast from '@/components/Toast';
import SettingsActionBar from './SettingsActionBar';
import { schoolProfileSchema } from '@/lib/schemas';
import { updateSchoolProfile } from '@/lib/api';

export default function SchoolProfileForm({ school }) {
  const [formError, setFormError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(schoolProfileSchema),
    defaultValues: {
      name: school.name,
      code: school.code,
      principalName: school.principalName || '',
      email: school.email,
      phone: school.phone,
      website: school.website || '',
    },
  });

  const onSubmit = async (data) => {
    setFormError('');
    try {
      const updated = await updateSchoolProfile(data);
      reset({
        name: updated.name,
        code: updated.code,
        principalName: updated.principalName || '',
        email: updated.email,
        phone: updated.phone,
        website: updated.website || '',
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
          <FiHome className="w-5 h-5" />
        </span>
        <div>
          <h3 className="text-lg font-bold text-gray-900">School Profile</h3>
          <p className="text-sm text-gray-500 mt-0.5">Manage your school&apos;s basic information.</p>
        </div>
      </div>

      {formError && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-4">{formError}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            School Name <span className="text-red-500">*</span>
          </label>
          <Input placeholder="e.g. ABC Public School" icon={<FiHome />} error={errors.name?.message} {...register('name')} />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="block text-sm font-medium text-gray-700">
              School Code <span className="text-red-500">*</span>
            </label>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide bg-gray-100 rounded-full px-2 py-0.5">
              Unique ID
            </span>
          </div>
          <Input placeholder="e.g. ABC-001" icon={<FiHash />} error={errors.code?.message} {...register('code')} />
          <p className="text-xs text-gray-400 mt-1.5">Used internally to identify your school across the platform.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Principal Name</label>
          <Input placeholder="e.g. Dr. Radhika Sharma" icon={<FiUser />} error={errors.principalName?.message} {...register('principalName')} />
        </div>

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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
          <Input placeholder="https://www.yourschool.edu" icon={<FiGlobe />} error={errors.website?.message} {...register('website')} />
        </div>
      </div>

      <SettingsActionBar onCancel={() => reset()} isSubmitting={isSubmitting} isDirty={isDirty} />

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </form>
  );
}
