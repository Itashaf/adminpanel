'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import Toggle from '@/components/Toggle';
import Button from '@/components/Button';
import { ADMIN_PERMISSIONS } from '@/lib/adminConstants';
import { updateAdminPermissions } from '@/lib/api';

export default function AdminPermissionsModal({ isOpen, onClose, admin, onSuccess }) {
  const [permissions, setPermissions] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!isOpen || !admin) return;
    setPermissions(admin.permissions || {});
    setFormError('');
  }, [isOpen, admin]);

  const handleSave = async () => {
    setIsSaving(true);
    setFormError('');
    try {
      const updated = await updateAdminPermissions(admin.id, permissions);
      onSuccess?.(`Permissions updated for ${admin.name}.`, updated);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      title="Admin Permissions"
      description={admin ? `Control what ${admin.name} can access.` : ''}
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <div className="w-full sm:w-auto">
            <Button label="Cancel" type="button" variant="secondary" onClick={onClose} fullWidth />
          </div>
          <Button label={isSaving ? 'Saving...' : 'Save Permissions'} onClick={handleSave} disabled={isSaving} />
        </div>
      }
    >
      {formError && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-4">{formError}</p>
      )}

      <div className="space-y-4 py-1">
        {ADMIN_PERMISSIONS.map(({ key, label, description }) => (
          <Toggle
            key={key}
            label={label}
            description={description}
            checked={Boolean(permissions[key])}
            onChange={(checked) => setPermissions((prev) => ({ ...prev, [key]: checked }))}
          />
        ))}
      </div>

      <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-4 py-3 mt-5">
        These permissions are stored on the admin's account for reference — enforcing them inside the school's own
        dashboard requires a real sign-in/session layer, which this demo doesn't have yet.
      </p>
    </Modal>
  );
}
