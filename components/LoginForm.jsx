'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight, FiShield, FiUser, FiUsers } from 'react-icons/fi';
import Button from './Button';
import Input from './Input';
import Form from './Form';
import RoleToggle from './RoleToggle';
import { loginSchema } from '@/lib/schemas';
import { schoolAdminLoginAction, teacherLoginAction, parentLoginAction, setCurrentRoleAction } from '@/app/actions/auth';

const ROLE_ICONS = {
  Admin: <FiShield className="w-4 h-4" />,
  Teacher: <FiUser className="w-4 h-4" />,
  Parent: <FiUsers className="w-4 h-4" />,
};

const VALID_ROLES = ['Admin', 'Teacher', 'Parent'];

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // The URL is the source of truth for which tab is selected — a
  // ?role=Teacher query param survives a refresh (and is shareable/
  // bookmarkable) without needing sessionStorage or an effect to
  // rehydrate it after mount.
  const roleFromUrl = searchParams.get('role');
  const [role, setRole] = useState(VALID_ROLES.includes(roleFromUrl) ? roleFromUrl : 'Admin');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formError, setFormError] = useState('');

  const handleRoleChange = (nextRole) => {
    setRole(nextRole);
    // replace (not push) so clicking between tabs doesn't spam browser
    // history — the user still ends up on the same page either way.
    router.replace(`/login?role=${nextRole}`, { scroll: false });
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data) => {
    setFormError('');
    if (role === 'Admin') {
      // Real, super-admin-assigned credentials (lib/admins.js).
      const result = await schoolAdminLoginAction(data);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      await setCurrentRoleAction('SchoolAdmin');
    } else if (role === 'Teacher') {
      // Real, school-admin-assigned credentials (lib/teachers.js's
      // loginAccess) — resolves and sets the specific signed-in teacher as
      // the current user server-side, so Attendance scoping etc. reflect
      // who actually logged in, not a hardcoded demo teacher.
      const result = await teacherLoginAction(data);
      if (result.error) {
        setFormError(result.error);
        return;
      }
    } else {
      // Parent portal — a real per-request session scoped to exactly one
      // student (see lib/iam.js's requireParent), not the dashboard-role
      // toggle the other two branches use.
      const result = await parentLoginAction(data);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      router.push('/parent');
      return;
    }
    router.push('/dashboard');
  };

  return (
    <div className="w-full lg:flex-1 min-w-0 h-full overflow-y-auto flex items-center justify-center px-8 py-6 sm:px-20 sm:py-8 bg-white relative z-10 lg:-ml-12 lg:rounded-tl-[48px] lg:rounded-bl-[48px] lg:shadow-2xl">
      <div className="w-full max-w-2xl">
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-gray-900">Welcome back</h1>
        <p className="text-base text-gray-500 mt-2">
          Please sign in to continue to <span className="font-semibold text-indigo-600">SchoolApp 360</span>.
        </p>
      </div>

      <div className="mb-4">
        <label className="block text-base font-medium text-gray-700 mb-2.5">Sign in as</label>
        <RoleToggle role={role} onChange={handleRoleChange} options={['Admin', 'Teacher', 'Parent']} icons={ROLE_ICONS} />
      </div>

      <Form onSubmit={handleSubmit(onSubmit)}>
        {formError && <p className="text-sm text-red-500">{formError}</p>}

        <div>
          <label className="block text-base font-medium text-gray-700 mb-2">Email</label>
          <Input
            // `type="email"` is what makes Chrome's Address/Contact-Info
            // Autofill treat this field as a "your saved emails" target in
            // the first place — that heuristic keys heavily off the type
            // itself, and ignores every autoComplete value once it decides
            // that. `type="text"` + `inputMode="email"` keeps the same
            // mobile email keyboard (validation is already zod-driven, not
            // native `type="email"` validation) while sidestepping that
            // specific heuristic entirely.
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
            // "new-password" is the one standard token Chrome/Edge/Firefox
            // actually honor for suppressing the saved-password suggestion
            // list — it tells the browser this is a password being set, not
            // one being entered to match an existing saved login.
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

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded border-gray-300 cursor-pointer"
            />
            Remember me
          </label>
          <Link href="/forgot-password" className="text-indigo-600 font-medium hover:underline cursor-pointer">
            Forgot Password?
          </Link>
        </div>

        <Button
          type="submit"
          label={isSubmitting ? 'Signing in...' : 'Sign In'}
          icon={<FiArrowRight className="w-4 h-4" />}
          fullWidth
        />
      </Form>

      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 text-sm text-gray-600">
        <FiShield className="w-4 h-4 text-indigo-500 shrink-0" />
        Platform super admin?{' '}
        <Link href="/" className="inline-flex items-center gap-1 text-indigo-600 font-medium hover:underline cursor-pointer">
          Go to Super Admin Sign In
          <FiArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
    </div>
  );
}
