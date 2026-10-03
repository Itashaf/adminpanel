'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight, FiShield, FiUser, FiUsers, FiBookOpen, FiDollarSign } from 'react-icons/fi';
import Button from './Button';
import Input from './Input';
import Form from './Form';
import RoleToggle from './RoleToggle';
import { loginSchema } from '@/lib/schemas';
import { schoolAdminLoginAction, teacherLoginAction, parentLoginAction } from '@/app/actions/auth';

const ROLE_ICONS = {
  Admin: <FiShield className="w-5 h-5 sm:w-4 sm:h-4" />,
  Principal: <FiBookOpen className="w-5 h-5 sm:w-4 sm:h-4" />,
  Accountant: <FiDollarSign className="w-5 h-5 sm:w-4 sm:h-4" />,
  Teacher: <FiUser className="w-5 h-5 sm:w-4 sm:h-4" />,
  Parent: <FiUsers className="w-5 h-5 sm:w-4 sm:h-4" />,
};

// Admin/Principal/Accountant all sign in through the same
// schoolAdminLoginAction (app/actions/auth.js tries the legacy SchoolAdmin
// table first, then falls back to a pure-User Principal/Accountant lookup)
// — these are just three visible tabs for that one action, not three
// separate code paths.
const SCHOOL_ADMIN_ROLES = ['Admin', 'Principal', 'Accountant'];
const VALID_ROLES = [...SCHOOL_ADMIN_ROLES, 'Teacher', 'Parent'];

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
  // Once the server says "too many attempts", the button stays disabled
  // for that same window instead of letting every extra click fire another
  // Server Action call the rate limiter will just reject again — the check
  // is already server-enforced, this just stops pointlessly hammering it.
  const [lockedUntil, setLockedUntil] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!lockedUntil) return;
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const isLocked = lockedUntil > Date.now();

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

  // Each action below redirect()s itself on success (see app/actions/auth.js
  // for why — a client-side router.push() right after a Server Action that
  // just set a session cookie can hit a stale entry in Next's Router Cache,
  // e.g. an earlier middleware.js redirect-to-/login this same tab cached
  // before signing in). So on success these calls never return normally —
  // only the `{ error }` case for bad credentials ever reaches past the
  // `await` here.
  const onSubmit = async (data) => {
    if (isLocked) return;
    setFormError('');
    let result;
    if (SCHOOL_ADMIN_ROLES.includes(role)) {
      // Real, super-admin-assigned credentials — legacy SchoolAdmin table
      // for Admin, User table for Principal/Accountant (lib/admins.js /
      // lib/rbac.js's validateUserCredentials).
      result = await schoolAdminLoginAction(data);
    } else if (role === 'Teacher') {
      // Real, school-admin-assigned credentials (lib/teachers.js's
      // loginAccess) — resolves and sets the specific signed-in teacher as
      // the current user server-side, so Attendance scoping etc. reflect
      // who actually logged in, not a hardcoded demo teacher.
      result = await teacherLoginAction(data);
    } else {
      // Parent portal — a real per-request session scoped to exactly one
      // student (see lib/iam.js's requireParent), not the dashboard-role
      // toggle the other two branches use.
      result = await parentLoginAction(data);
    }
    if (result.error) {
      setFormError(result.error);
      if (result.retryAfterSeconds) setLockedUntil(Date.now() + result.retryAfterSeconds * 1000);
    }
  };

  return (
    <div className="w-full lg:flex-1 min-w-0 h-full overflow-y-auto bg-white sm:flex sm:items-center sm:justify-center sm:px-20 sm:py-8 relative z-10 lg:-ml-12 lg:rounded-tl-[48px] lg:rounded-bl-[48px] lg:shadow-2xl">
      {/* Mobile-only gradient header band — "Design 7, Split Style (Stacked
          for Mobile)" reference. Hidden at sm: and up, where the original
          split-screen layout (LoginLeftPanel) already carries the brand. */}
      <div className="sm:hidden bg-violet-100 rounded-b-[32px] pt-12 pb-9 px-6 text-center">
        <Image src="/images/logo_schoolapp360.png" alt="SchoolApp 360" width={220} height={76} priority className="mx-auto h-auto w-[220px]" />
        <p className="text-xs text-indigo-700/70 mt-1">Smart School Management</p>
      </div>

      <div className="w-full px-6 py-6 sm:max-w-2xl sm:px-0 sm:py-0">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900">
          <span className="sm:hidden">Welcome back 👋</span>
          <span className="hidden sm:inline">Welcome back</span>
        </h1>
        <p className="text-sm sm:text-base text-gray-500 mt-1 sm:mt-2">
          <span className="sm:hidden">Sign in to continue</span>
          <span className="hidden sm:inline">
            Please sign in to continue to <span className="font-semibold text-indigo-600">SchoolApp 360</span>.
          </span>
        </p>
      </div>

      <div className="mb-4">
        <label className="block text-base font-medium text-gray-700 mb-2.5">Sign in as</label>
        <RoleToggle role={role} onChange={handleRoleChange} options={VALID_ROLES} icons={ROLE_ICONS} />
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
          label={
            isLocked
              ? `Try again in ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`
              : isSubmitting
                ? 'Signing in...'
                : 'Sign In'
          }
          icon={<FiArrowRight className="w-4 h-4" />}
          fullWidth
          disabled={isSubmitting || isLocked}
        />
      </Form>

      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-4 pt-4 border-t border-gray-100 text-sm text-gray-600">
        <span className="flex items-center gap-2">
          <FiShield className="w-4 h-4 text-indigo-500 shrink-0" />
          Platform super admin?
        </span>
        <Link href="/" className="inline-flex items-center gap-1 text-indigo-600 font-medium hover:underline cursor-pointer">
          Go to Super Admin Sign In
          <FiArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
    </div>
  );
}
