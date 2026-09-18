'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FiMail, FiLock, FiEye, FiEyeOff, FiShield, FiArrowRight, FiUser } from 'react-icons/fi';
import Button from './Button';
import Input from './Input';
import Form from './Form';
import { loginSchema } from '@/lib/schemas';
import { superAdminLoginAction } from '@/app/actions/auth';

// Display-only — lib/auth.js is now server-only (it imports the Prisma
// client), so this can't be imported into a 'use client' component. Keep
// this in sync with prisma/seed.js's seeded super admin if either changes.
const SUPER_ADMIN_TEST_CREDENTIALS = { email: 'superadmin@edumanage.io', password: 'SuperAdmin@123' };

export default function SuperAdminLoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema) });

  // superAdminLoginAction redirect()s itself on success (see
  // app/actions/auth.js) — a client-side router.push() right after would
  // risk hitting a stale entry in Next's Router Cache. So this only ever
  // returns normally for the `{ error }` (bad credentials) case.
  const onSubmit = async (data) => {
    setFormError('');
    const result = await superAdminLoginAction(data);
    if (result.error) setFormError(result.error);
  };

  return (
    <div className="w-full lg:flex-1 min-w-0 h-full overflow-y-auto flex items-center justify-center px-8 py-6 sm:px-20 sm:py-8 bg-white relative z-10 lg:-ml-12 lg:rounded-tl-[48px] lg:rounded-bl-[48px] lg:shadow-2xl">
      <div className="w-full max-w-2xl">
        <div className="mb-6">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-full px-3 py-1 mb-4">
            <FiShield className="w-3.5 h-3.5" />
            Super Admin
          </span>
          <h1 className="text-4xl font-bold text-gray-900">Platform sign in</h1>
          <p className="text-base text-gray-500 mt-2">Manage every school on the platform from one place.</p>
        </div>

        <Form onSubmit={handleSubmit(onSubmit)}>
          {formError && <p className="text-sm text-red-500">{formError}</p>}

          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">Email</label>
            <Input
              type="text"
              inputMode="email"
              placeholder="Enter your email"
              icon={<FiMail />}
              error={errors.email?.message}
              {...register('email')}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">Password</label>
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              icon={<FiLock />}
              error={errors.password?.message}
              {...register('password')}
              autoComplete="new-password"
              endAdornment={
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="pointer-events-auto cursor-pointer"
                >
                  {showPassword ? <FiEye /> : <FiEyeOff />}
                </button>
              }
            />
          </div>

          <Button
            type="submit"
            label={isSubmitting ? 'Signing in...' : 'Sign In'}
            icon={<FiArrowRight className="w-4 h-4" />}
            fullWidth
          />
        </Form>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs font-medium text-gray-400">OR</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        <div className="flex items-start gap-3 bg-gray-50 rounded-xl px-4 py-3.5">
          <span className="flex items-center justify-center w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 shrink-0">
            <FiUser className="w-4 h-4" />
          </span>
          <div className="text-xs text-gray-500 min-w-0">
            <p className="text-sm font-semibold text-gray-800 mb-1.5">Test credentials</p>
            <p>
              Email: <span className="font-medium text-gray-700">{SUPER_ADMIN_TEST_CREDENTIALS.email}</span>
            </p>
            <p>
              Password: <span className="font-medium text-gray-700">{SUPER_ADMIN_TEST_CREDENTIALS.password}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 text-sm text-gray-600">
          <FiUser className="w-4 h-4 text-indigo-500 shrink-0" />
          Signing in as a school admin?{' '}
          <Link href="/login" className="inline-flex items-center gap-1 text-indigo-600 font-medium hover:underline cursor-pointer">
            Go to School Sign In
            <FiArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
