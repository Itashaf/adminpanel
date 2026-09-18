'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FiMail, FiArrowLeft, FiSend } from 'react-icons/fi';
import { MdMarkEmailRead } from 'react-icons/md';
import { FaGraduationCap } from 'react-icons/fa';
import Button from './Button';
import Input from './Input';
import Form from './Form';
import { forgotPasswordSchema } from '@/lib/schemas';
import { requestPasswordResetAction } from '@/app/actions/auth';

export default function ForgotPasswordForm() {
  const [formError, setFormError] = useState('');
  const [sentEmail, setSentEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (data) => {
    setFormError('');
    const result = await requestPasswordResetAction(data);
    if (result.error) {
      setFormError(result.error);
      return;
    }
    setSentEmail(data.email);
  };

  if (sentEmail) {
    return (
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-10">
        <div className="flex flex-col items-center text-center">
          <span className="flex items-center justify-center w-14 h-14 rounded-full bg-violet-700 mb-5">
            <MdMarkEmailRead className="w-7 h-7 text-white" />
          </span>
          <h2 className="text-lg font-semibold text-indigo-700">Check your email</h2>
          <p className="text-sm text-gray-500 mt-2 mb-6">
            We&apos;ve sent a password reset link to
            <br />
            <span className="font-medium text-gray-700">{sentEmail}</span>
          </p>

          <Button
            label="Back to Login"
            variant="secondary"
            fullWidth
            onClick={() => (window.location.href = '/login')}
          />

          <p className="text-sm text-gray-500 mt-5">
            Didn&apos;t receive the email?{' '}
            <button
              type="button"
              onClick={() => setSentEmail('')}
              className="text-indigo-700 font-semibold hover:underline cursor-pointer"
            >
              Resend
            </button>
          </p>
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
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Forgot Password</h2>
        <p className="text-sm text-gray-500 max-w-xs">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      <Form onSubmit={handleSubmit(onSubmit)}>
        {formError && <p className="text-sm text-red-500">{formError}</p>}

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Email Address</label>
          <Input
            type="email"
            placeholder="admin@school.edu"
            icon={<FiMail />}
            error={errors.email?.message}
            {...register('email')}
          />
        </div>

        <Button
          type="submit"
          label={isSubmitting ? 'Sending...' : 'Send Reset Link'}
          icon={!isSubmitting && <FiSend />}
          disabled={isSubmitting}
          fullWidth
        />
      </Form>

      <Link
        href="/login"
        className="flex items-center justify-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900 mt-6 cursor-pointer"
      >
        <FiArrowLeft />
        Back to Login
      </Link>
    </div>
  );
}
