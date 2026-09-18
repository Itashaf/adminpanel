'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FiUser, FiMail, FiLock } from 'react-icons/fi';
import Modal from '@/components/Modal';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { createSchoolAdminSchema } from '@/lib/schemas';
import { createSchoolAdmin } from '@/lib/api';

export default function CreateAdminModal({ isOpen, onClose, school, onSuccess }) {
  const [formError, setFormError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(createSchoolAdminSchema) });

  useEffect(() => {
    if (!isOpen) return;
    reset({ name: school?.principalName || '', email: school?.email || '', password: '' });
    setFormError('');
  }, [isOpen, school, reset]);

  const handleClose = () => {
    setFormError('');
    onClose();
  };

  const onSubmit = async (data) => {
    setFormError('');
    try {
      const created = await createSchoolAdmin(school.id, data);
      onSuccess?.(`Admin account created for ${school.name}.`, created);
    } catch (err) {
      setFormError(err.message);
    }
  };

  return (
    <Modal
      title="Create School Admin"
      description={`Set up the admin account for ${school?.name || 'this school'}.`}
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      footer={
        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <div className="w-full sm:w-auto">
            <Button label="Cancel" type="button" variant="secondary" onClick={handleClose} fullWidth />
          </div>
          <Button type="submit" form="create-admin-form" label={isSubmitting ? 'Creating...' : 'Create Admin'} disabled={isSubmitting} />
        </div>
      }
    >
      <form id="create-admin-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 py-1">
        {formError && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{formError}</p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Admin Name <span className="text-red-500">*</span>
            </label>
            <Input placeholder="e.g. Dr. Radhika Sharma" icon={<FiUser />} error={errors.name?.message} {...register('name')} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <Input type="email" placeholder="admin@school.edu" icon={<FiMail />} error={errors.email?.message} {...register('email')} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Temporary Password <span className="text-red-500">*</span>
          </label>
          <Input type="text" placeholder="Set an initial password" icon={<FiLock />} error={errors.password?.message} {...register('password')} />
          <p className="text-xs text-gray-400 mt-1.5">Share this with the school — they can reset it later from their own account.</p>
        </div>
      </form>
    </Modal>
  );
}
