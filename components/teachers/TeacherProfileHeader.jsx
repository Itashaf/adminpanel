'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiEdit2, FiMoreVertical, FiUserX, FiUserCheck, FiKey, FiCalendar, FiAward, FiClock } from 'react-icons/fi';
import Button from '@/components/Button';
import DropdownMenu from '@/components/DropdownMenu';
import ConfirmDialog from '@/components/ConfirmDialog';
import Toast from '@/components/Toast';
import ResetPasswordDialog from './ResetPasswordDialog';
import { formatServicePeriod } from './TeacherOverviewCards';
import { updateTeacherStatus } from '@/lib/api';

// Inline stats on the wide (2xl+) header card — same data as the overview cards
// below it, which hide these five at that width.
function HeaderStats({ teacher }) {
  const stats = [
    { label: 'Service Period', value: formatServicePeriod(teacher), icon: FiCalendar, tile: 'bg-violet-50 text-violet-700' },
    { label: 'Qualification', value: teacher.qualification || '—', icon: FiAward, tile: 'bg-blue-50 text-blue-600' },
    { label: 'Experience', value: teacher.experience || '—', icon: FiClock, tile: 'bg-amber-50 text-amber-600' },
  ];
  return (
    <div className="hidden 2xl:flex items-center flex-1 min-w-0 border-l border-gray-100 ml-2">
      {stats.map(({ label, value, icon: Icon, tile }) => (
        <div key={label} className="flex items-center gap-3 px-5 min-w-0 border-r border-gray-100 last:border-r-0">
          <span className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${tile}`}>
            <Icon className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-gray-400">{label}</p>
            <p className="text-sm font-semibold text-gray-900 truncate">{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TeacherProfileHeader({ teacher }) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [resetToastMessage, setResetToastMessage] = useState('');
  const isActive = teacher.status === 'Active';

  const handleToggleStatus = async () => {
    setIsUpdating(true);
    try {
      await updateTeacherStatus(teacher.id, isActive ? 'Inactive' : 'Active');
      setShowConfirm(false);
      setShowToast(true);
      router.refresh();
    } finally {
      setIsUpdating(false);
    }
  };

  const moreItems = [
    ...(teacher.loginAccess?.enabled
      ? [
          {
            // A teacher who's never actually set a password yet (didn't use
            // their first invite, or it expired — see /set-password's
            // "Link invalid or expired") needs a fresh invite, not a
            // "reset" of something that was never set.
            label: teacher.loginAccess?.hasPassword ? 'Reset Login Password' : 'Resend Login Invite',
            icon: <FiKey className="w-4 h-4" />,
            onClick: () => setShowResetDialog(true),
          },
        ]
      : []),
    {
      label: isActive ? 'Deactivate' : 'Activate',
      icon: isActive ? <FiUserX className="w-4 h-4" /> : <FiUserCheck className="w-4 h-4" />,
      onClick: () => setShowConfirm(true),
      danger: isActive,
    },
  ];

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard/teachers"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-700 transition cursor-pointer"
          >
            <FiArrowLeft className="w-4 h-4" />
            Teachers
          </Link>

          {/* 2xl+: actions sit up here, beside the back link, instead of in the card. */}
          <div className="hidden 2xl:flex items-center gap-2">
            <Button
              label="Edit Teacher"
              variant="secondary"
              icon={<FiEdit2 className="w-4 h-4" />}
              onClick={() => router.push(`/dashboard/teachers/${teacher.id}/edit`)}
            />
            <DropdownMenu trigger={<FiMoreVertical className="w-5 h-5" />} items={moreItems} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-8 flex items-center gap-4 sm:gap-5">
          <div className="relative shrink-0">
            {teacher.photoUrl ? (
              <img src={teacher.photoUrl} alt="" className="w-20 h-20 sm:w-16 sm:h-16 rounded-full sm:rounded-2xl 2xl:w-24 2xl:h-24 2xl:rounded-full object-cover" />
            ) : (
              <span className="flex items-center justify-center w-20 h-20 rounded-full bg-violet-100 text-violet-700 sm:w-16 sm:h-16 sm:rounded-2xl sm:bg-gradient-to-br sm:from-violet-700 sm:to-blue-600 sm:text-white text-2xl sm:text-xl font-semibold 2xl:w-24 2xl:h-24 2xl:rounded-full 2xl:text-3xl">
                {teacher.initials}
              </span>
            )}
            {/* Phone: status shown as a dot on the avatar instead of the chip. */}
            <span
              title={teacher.status}
              className={`sm:hidden absolute top-0 right-0 w-4 h-4 rounded-full border-2 border-white ${isActive ? 'bg-green-500' : 'bg-red-500'}`}
            />
          </div>

          <div className="flex-1 min-w-0 2xl:flex-none 2xl:min-w-[200px]">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              {teacher.firstName} {teacher.lastName}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">{teacher.employeeId}</p>
            <div className="flex items-center flex-wrap gap-2 mt-2.5">
              <span className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-1">{teacher.designation}</span>
              <span
                className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1 ${
                  isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-600' : 'bg-gray-400'}`} />
                {teacher.status}
              </span>
            </div>
          </div>

          {/* Phone: edit + more as stacked icon buttons, split off by a divider. */}
          <div className="sm:hidden flex flex-col gap-2 pl-4 border-l border-gray-100 shrink-0">
            <button
              type="button"
              aria-label="Edit Teacher"
              onClick={() => router.push(`/dashboard/teachers/${teacher.id}/edit`)}
              className="flex items-center justify-center w-11 h-11 rounded-xl bg-gray-100 text-gray-800 cursor-pointer"
            >
              <FiEdit2 className="w-4 h-4" />
            </button>
            <div className="[&_button]:flex [&_button]:items-center [&_button]:justify-center [&_button]:w-11 [&_button]:h-11 [&_button]:rounded-xl [&_button]:bg-gray-100 [&_button]:text-gray-800">
              <DropdownMenu trigger={<FiMoreVertical className="w-5 h-5" />} items={moreItems} />
            </div>
          </div>
          <HeaderStats teacher={teacher} />
          <div className="hidden sm:flex 2xl:hidden items-center gap-2 shrink-0">
            <Button
              label="Edit Teacher"
              variant="secondary"
              icon={<FiEdit2 className="w-4 h-4" />}
              onClick={() => router.push(`/dashboard/teachers/${teacher.id}/edit`)}
            />
            <DropdownMenu trigger={<FiMoreVertical className="w-5 h-5" />} items={moreItems} />
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleToggleStatus}
        title={isActive ? 'Deactivate teacher?' : 'Activate teacher?'}
        description={
          isActive
            ? `${teacher.firstName} ${teacher.lastName} will lose access and be marked inactive. You can reactivate them anytime.`
            : `${teacher.firstName} ${teacher.lastName} will be marked active again.`
        }
        confirmLabel={isActive ? 'Deactivate' : 'Activate'}
        isLoading={isUpdating}
      />

      <ResetPasswordDialog
        isOpen={showResetDialog}
        onClose={() => setShowResetDialog(false)}
        teacher={teacher}
        onSuccess={() =>
          setResetToastMessage(teacher.loginAccess?.hasPassword ? 'Password reset link sent.' : 'Login invite resent.')
        }
      />

      {showToast && (
        <Toast message={isActive ? 'Teacher deactivated.' : 'Teacher activated.'} onClose={() => setShowToast(false)} />
      )}
      {resetToastMessage && <Toast message={resetToastMessage} onClose={() => setResetToastMessage('')} />}
    </>
  );
}
