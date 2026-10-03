'use client';

import { useState } from 'react';
import { FiCreditCard, FiCheckCircle } from 'react-icons/fi';
import Input from '@/components/Input';
import Button from '@/components/Button';
import ConfirmDialog from '@/components/ConfirmDialog';
import Toast from '@/components/Toast';
import { updateSchoolRazorpayKeys } from '@/lib/api';

// Super Admin-only — every school must have its own Razorpay account, no
// platform-wide fallback (see lib/razorpay.js's getRazorpayCredentials,
// which throws if a school has no keys set). Online fee payment is simply
// unavailable for a school until this is filled in. The key secret is
// never fetched back from the server once saved (lib/schools.js's
// decorateSchool only ever returns `hasRazorpayKeys`, a boolean) — this
// form always starts blank, so leaving the Key Secret field empty on save
// means "keep the existing one", not "clear it".
export default function SchoolPaymentSettingsCard({ school }) {
  const [keyId, setKeyId] = useState(school.razorpayKeyId || '');
  const [keySecret, setKeySecret] = useState('');
  const [hasKeys, setHasKeys] = useState(school.hasRazorpayKeys);
  const [isSaving, setIsSaving] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [formError, setFormError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const handleSave = async () => {
    setIsSaving(true);
    setFormError('');
    try {
      const updated = await updateSchoolRazorpayKeys(school.id, { keyId, keySecret: keySecret || undefined });
      setHasKeys(updated.hasRazorpayKeys);
      setKeySecret('');
      setToastMessage('Razorpay keys saved for this school.');
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    setIsClearing(true);
    try {
      const updated = await updateSchoolRazorpayKeys(school.id, { clear: true });
      setHasKeys(updated.hasRazorpayKeys);
      setKeyId('');
      setKeySecret('');
      setShowClearConfirm(false);
      setToastMessage('Razorpay keys removed — online fee payment is off for this school until new keys are set.');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
      <div className="flex items-center gap-4 mb-6">
        <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-violet-100 text-violet-600 shrink-0">
          <FiCreditCard className="w-5 h-5" />
        </span>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Payment Settings</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            This school&apos;s own Razorpay account — required for online fee payment to work.
          </p>
        </div>
      </div>

      {hasKeys ? (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-full px-3 py-1 w-fit mb-4">
          <FiCheckCircle className="w-3.5 h-3.5" />
          Razorpay account connected
        </p>
      ) : (
        <p className="text-xs font-semibold text-amber-700 bg-amber-50 rounded-full px-3 py-1 w-fit mb-4">
          No keys set — online fee payment is off for this school
        </p>
      )}

      {formError && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-4">{formError}</p>
      )}

      <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Razorpay Key ID</label>
          <Input value={keyId} onChange={(e) => setKeyId(e.target.value)} placeholder="rzp_live_..." />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Razorpay Key Secret</label>
          <Input
            type="password"
            value={keySecret}
            onChange={(e) => setKeySecret(e.target.value)}
            placeholder={hasKeys ? 'Already set — leave blank to keep it' : 'Enter key secret'}
            autoComplete="new-password"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button label={isSaving ? 'Saving...' : 'Save'} onClick={handleSave} disabled={isSaving || !keyId} />
          {hasKeys && (
            <Button
              label="Remove Keys"
              variant="secondary"
              onClick={() => setShowClearConfirm(true)}
              disabled={isSaving}
            />
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClear}
        title="Remove this school's Razorpay keys?"
        description="Online fee payment will stop working for this school until new keys are set — there's no fallback account."
        confirmLabel="Remove"
        isLoading={isClearing}
      />

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}
