'use client';

import { useState } from 'react';
import Toast from '@/components/Toast';
import ConfirmDialog from '@/components/ConfirmDialog';
import AdminsStatsCards from './AdminsStatsCards';
import AdminsTable from './AdminsTable';
import AdminPermissionsModal from './AdminPermissionsModal';
import ResetPasswordDialog from './ResetPasswordDialog';
import { updateAdminStatus } from '@/lib/api';

export default function AdminsDirectory({ admins, schoolsWithoutAdmin }) {
  // Seeded once from the server-rendered list, then updated directly from
  // each mutation's own response — every admin API route already returns the
  // full updated record, so there's nothing to gain from a router.refresh()
  // (which would re-run getAllAdmins()) just to see a value the client
  // already has. See the "Optimistic UI Updates" rule in SKILL.md.
  const [adminsList, setAdminsList] = useState(admins);
  const [toastMessage, setToastMessage] = useState('');
  const [permissionsTarget, setPermissionsTarget] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [isToggling, setIsToggling] = useState(false);

  const patchAdmin = (id, updated) => {
    setAdminsList((prev) => prev.map((a) => (a.id === id ? { ...a, ...updated } : a)));
  };

  const handleToggleStatus = async () => {
    if (!toggleTarget) return;
    setIsToggling(true);
    try {
      const nextStatus = toggleTarget.status === 'Active' ? 'Inactive' : 'Active';
      const updated = await updateAdminStatus(toggleTarget.id, nextStatus);
      patchAdmin(toggleTarget.id, updated);
      setToggleTarget(null);
      setToastMessage(`${toggleTarget.name} is now ${nextStatus.toLowerCase()}.`);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admins</h1>
        <p className="text-sm text-gray-500 mt-1">Every school admin account on the platform, in one place.</p>
      </div>

      <AdminsStatsCards admins={adminsList} schoolsWithoutAdmin={schoolsWithoutAdmin} />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {adminsList.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-16">No admin accounts yet — create one from a school's detail page.</p>
        ) : (
          <AdminsTable
            admins={adminsList}
            onEditPermissions={setPermissionsTarget}
            onResetPassword={setResetTarget}
            onToggleStatus={setToggleTarget}
          />
        )}
      </div>

      <AdminPermissionsModal
        isOpen={Boolean(permissionsTarget)}
        onClose={() => setPermissionsTarget(null)}
        admin={permissionsTarget}
        onSuccess={(message, updated) => {
          patchAdmin(permissionsTarget.id, updated);
          setPermissionsTarget(null);
          setToastMessage(message);
        }}
      />

      <ResetPasswordDialog isOpen={Boolean(resetTarget)} onClose={() => setResetTarget(null)} admin={resetTarget} />

      <ConfirmDialog
        isOpen={Boolean(toggleTarget)}
        onClose={() => setToggleTarget(null)}
        onConfirm={handleToggleStatus}
        title={toggleTarget?.status === 'Active' ? 'Deactivate admin?' : 'Activate admin?'}
        description={
          toggleTarget?.status === 'Active'
            ? `${toggleTarget?.name} will no longer be able to sign in.`
            : `${toggleTarget?.name} will be able to sign in again.`
        }
        confirmLabel={toggleTarget?.status === 'Active' ? 'Deactivate' : 'Activate'}
        isLoading={isToggling}
      />

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}
