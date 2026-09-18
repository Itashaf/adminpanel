'use client';

import { useState } from 'react';
import { FiUser, FiPlus, FiKey, FiSliders, FiUserCheck, FiUserX, FiMail } from 'react-icons/fi';
import ConfirmDialog from '@/components/ConfirmDialog';
import Toast from '@/components/Toast';
import StatusPill from './StatusPill';
import CreateAdminModal from './CreateAdminModal';
import AdminPermissionsModal from './AdminPermissionsModal';
import ResetPasswordDialog from './ResetPasswordDialog';
import { ADMIN_PERMISSIONS } from '@/lib/adminConstants';
import { updateAdminStatus } from '@/lib/api';

export default function SchoolAdminCard({ school, admin: initialAdmin }) {
  // Seeded once from the server-rendered admin (or null, if the school has
  // none yet), then updated directly from each mutation's own response —
  // create/permissions/status all return the full admin record, so there's
  // no need for a router.refresh() (which would re-run getAdminBySchoolId())
  // just to see a value the client already has.
  const [admin, setAdmin] = useState(initialAdmin);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showToggleConfirm, setShowToggleConfirm] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleSuccess = (message, updated) => {
    setShowCreateModal(false);
    setShowPermissionsModal(false);
    if (updated) setAdmin((prev) => ({ ...prev, ...updated }));
    if (message) setToastMessage(message);
  };

  const handleToggleStatus = async () => {
    setIsToggling(true);
    try {
      const updated = await updateAdminStatus(admin.id, admin.status === 'Active' ? 'Inactive' : 'Active');
      setAdmin((prev) => ({ ...prev, ...updated }));
      setShowToggleConfirm(false);
      setToastMessage(admin.status === 'Active' ? 'Admin deactivated.' : 'Admin activated.');
    } finally {
      setIsToggling(false);
    }
  };

  const grantedCount = admin ? ADMIN_PERMISSIONS.filter(({ key }) => admin.permissions?.[key]).length : 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
      <div className="flex items-center gap-4 mb-6">
        <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-violet-100 text-violet-600 shrink-0">
          <FiUser className="w-5 h-5" />
        </span>
        <div>
          <h3 className="text-lg font-bold text-gray-900">School Admin</h3>
          <p className="text-sm text-gray-500 mt-0.5">The account this school signs in with.</p>
        </div>
      </div>

      {!admin ? (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500 mb-4">No admin account has been created for this school yet.</p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer"
          >
            <FiPlus className="w-4 h-4" />
            Create Admin
          </button>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex items-center justify-center w-11 h-11 rounded-full bg-gradient-to-br from-violet-700 to-blue-600 text-white text-sm font-semibold shrink-0">
                {admin.name
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join('')
                  .toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="font-bold text-gray-900 truncate">{admin.name}</p>
                <p className="flex items-center gap-1.5 text-sm text-gray-500 mt-0.5">
                  <FiMail className="w-3.5 h-3.5 text-gray-400" />
                  {admin.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <StatusPill status={admin.status} />
              <span className="text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded-full px-2.5 py-1">
                {grantedCount} / {ADMIN_PERMISSIONS.length} permissions
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-5">
            <button
              type="button"
              onClick={() => setShowPermissionsModal(true)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg px-3.5 py-2 hover:bg-gray-50 transition cursor-pointer"
            >
              <FiSliders className="w-3.5 h-3.5" />
              Edit Permissions
            </button>
            <button
              type="button"
              onClick={() => setShowResetDialog(true)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg px-3.5 py-2 hover:bg-gray-50 transition cursor-pointer"
            >
              <FiKey className="w-3.5 h-3.5" />
              Reset Password
            </button>
            <button
              type="button"
              onClick={() => setShowToggleConfirm(true)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 bg-white border border-gray-200 rounded-lg px-3.5 py-2 hover:bg-red-50 transition cursor-pointer"
            >
              {admin.status === 'Active' ? <FiUserX className="w-3.5 h-3.5" /> : <FiUserCheck className="w-3.5 h-3.5" />}
              {admin.status === 'Active' ? 'Deactivate Admin' : 'Activate Admin'}
            </button>
          </div>
        </div>
      )}

      <CreateAdminModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} school={school} onSuccess={handleSuccess} />
      <AdminPermissionsModal
        isOpen={showPermissionsModal}
        onClose={() => setShowPermissionsModal(false)}
        admin={admin}
        onSuccess={handleSuccess}
      />
      <ResetPasswordDialog isOpen={showResetDialog} onClose={() => setShowResetDialog(false)} admin={admin} />

      <ConfirmDialog
        isOpen={showToggleConfirm}
        onClose={() => setShowToggleConfirm(false)}
        onConfirm={handleToggleStatus}
        title={admin?.status === 'Active' ? 'Deactivate admin?' : 'Activate admin?'}
        description={
          admin?.status === 'Active'
            ? `${admin?.name} will no longer be able to sign in.`
            : `${admin?.name} will be able to sign in again.`
        }
        confirmLabel={admin?.status === 'Active' ? 'Deactivate' : 'Activate'}
        isLoading={isToggling}
      />

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}
