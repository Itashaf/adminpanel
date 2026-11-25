'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FiLock, FiCheck, FiEye, FiEyeOff } from 'react-icons/fi';
import { FaGraduationCap } from 'react-icons/fa';
import Button from './Button';
import Input from './Input';
import Form from './Form';
import { setPasswordSchema } from '@/lib/schemas';
import { setPasswordAction } from '@/app/actions/auth';

export default function SetPasswordForm({ token, teacherName, redirectTo = '/login?role=Teacher' }) {
  const router = useRouter();
  const [formError, setFormError] = useState('');
  const [isDone, setIsDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(setPasswordSchema) });

  const onSubmit = async (data) => {
    setFormError('');
    const result = await setPasswordAction({ token, password: data.password });
    if (result.error) {
      setFormError(result.error);
      return;
    }
    setIsDone(true);
    setTimeout(() => router.push(redirectTo), 1800);
  };

  if (isDone) {
    return (
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-10">
        <div className="flex flex-col items-center text-center">
          <span className="flex items-center justify-center w-14 h-14 rounded-full bg-green-100 mb-5">
            <FiCheck className="w-7 h-7 text-green-600" />
          </span>
          <h2 className="text-lg font-semibold text-gray-900">Password set</h2>
          <p className="text-sm text-gray-500 mt-2">Taking you to the login page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-10">
      <div className="flex flex-col items-center text-center mb-8">
        <span className="flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-700 mb-3">
          <FaGraduationCap className="w-8 h-8 text-white" />
        </span>
        <h1 className="text-2xl font-bold text-indigo-700 mb-6">SchoolApp 360</h1>
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Set Your Password</h2>
        <p className="text-sm text-gray-500 max-w-xs">
          Hi {teacherName}, choose a password to sign in with from now on.
        </p>
      </div>

      <Form onSubmit={handleSubmit(onSubmit)}>
        {formError && <p className="text-sm text-red-500">{formError}</p>}

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">New Password</label>
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="At least 8 characters"
            icon={<FiLock />}
            endAdornment={
            <button type="button" onClick={() => setShowPassword((prev) => !prev)} className="pointer-events-auto cursor-pointer" aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <FiEye /> : <FiEyeOff />}
            </button>
          }
            error={errors.password?.message}
            {...register('password')}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Confirm Password</label>
          <Input
            type={showConfirm ? 'text' : 'password'}
            placeholder="Re-enter password"
            icon={<FiLock />}
            endAdornment={
            <button type="button" onClick={() => setShowConfirm((prev) => !prev)} className="pointer-events-auto cursor-pointer" aria-label={showConfirm ? 'Hide password' : 'Show password'}>
              {showConfirm ? <FiEye /> : <FiEyeOff />}
            </button>
          }
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
        </div>

        <Button type="submit" label={isSubmitting ? 'Saving...' : 'Set Password'} disabled={isSubmitting} fullWidth />
      </Form>
    </div>
  );
}
