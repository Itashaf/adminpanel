'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FiHome, FiHash, FiUser } from 'react-icons/fi';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { setupSchoolInfoSchema } from '@/lib/schemas';

export default function StepSchoolInfo({ defaultValues, onContinue }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(setupSchoolInfoSchema),
    defaultValues: {
      name: defaultValues.name,
      code: defaultValues.code,
      principalName: defaultValues.principalName,
    },
  });

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900">School Information</h2>
      <p className="text-sm text-gray-500 mt-1 mb-6">Let&apos;s start with the basics about your school.</p>

      <form onSubmit={handleSubmit(onContinue)} noValidate className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            School Name <span className="text-red-500">*</span>
          </label>
          <Input placeholder="e.g. ABC Public School" icon={<FiHome />} error={errors.name?.message} {...register('name')} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            School Code <span className="text-red-500">*</span>
          </label>
          <Input placeholder="e.g. ABC-001" icon={<FiHash />} error={errors.code?.message} {...register('code')} />
          <p className="text-xs text-gray-400 mt-1.5">A unique identifier for your school on the platform.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Principal Name</label>
          <Input placeholder="e.g. Dr. Radhika Sharma" icon={<FiUser />} error={errors.principalName?.message} {...register('principalName')} />
        </div>

        <div className="pt-2">
          <Button type="submit" label="Continue" fullWidth />
        </div>
      </form>
    </div>
  );
}
