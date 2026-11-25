'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft, FiLogOut, FiMenu } from 'react-icons/fi';
import ConfirmDialog from '@/components/ConfirmDialog';
import { logoutAction } from '@/app/actions/auth';

export default function SuperAdminTopbar({ onMenuClick }) {
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
    <header className="flex items-center gap-3 px-4 sm:px-6 py-3.5 bg-white border-b border-gray-100 shrink-0">
      <button type="button" onClick={onMenuClick} className="lg:hidden text-gray-400 hover:text-gray-600 cursor-pointer">
        <FiMenu className="w-5 h-5" />
      </button>

      <div className="ml-auto flex items-center gap-4 sm:gap-5">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition cursor-pointer"
        >
          <FiArrowLeft className="w-4 h-4" />
          Back to My School
        </Link>

        <button
          type="button"
          onClick={() => setShowLogoutConfirm(true)}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition cursor-pointer"
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
