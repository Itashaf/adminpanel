'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaGraduationCap } from 'react-icons/fa';
import { FiArrowLeft, FiLogOut } from 'react-icons/fi';
import ConfirmDialog from '@/components/ConfirmDialog';
import { logoutAction } from '@/app/actions/auth';

export default function SuperAdminTopbar() {
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logoutAction();
    // Super admin signs in at '/' (SuperAdminLoginForm), not '/login' —
    // that route is for School Admin/Teacher.
    router.push('/');
  };

  return (
    <header className="flex items-center gap-3 px-4 sm:px-6 py-3.5 bg-gradient-to-r from-purple-950 to-indigo-950 text-white shrink-0">
      <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-white shrink-0">
        <FaGraduationCap className="w-5 h-5 text-purple-900" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold leading-tight">SchoolApp 360</p>
        <p className="text-[11px] text-purple-300 leading-tight">Super Admin</p>
      </div>

      <div className="ml-auto flex items-center gap-4 sm:gap-5">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm font-medium text-purple-200 hover:text-white transition cursor-pointer"
        >
          <FiArrowLeft className="w-4 h-4" />
          Back to My School
        </Link>

        <button
          type="button"
          onClick={() => setShowLogoutConfirm(true)}
          className="flex items-center gap-1.5 text-sm font-medium text-purple-200 hover:text-white transition cursor-pointer"
        >
          <FiLogOut className="w-4 h-4" />
          Logout
        </button>
      </div>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Log out?"
        description="You'll need to sign in again to access the Super Admin panel."
        confirmLabel="Log Out"
        isLoading={isLoggingOut}
      />
    </header>
  );
}
