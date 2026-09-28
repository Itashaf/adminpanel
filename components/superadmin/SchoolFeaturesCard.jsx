'use client';

import { useState } from 'react';
import { FiToggleRight } from 'react-icons/fi';
import Toggle from '@/components/Toggle';
import Toast from '@/components/Toast';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { updateSchoolFeatures } from '@/lib/api';

export default function SchoolFeaturesCard({ school }) {
  const [disabledFeatures, setDisabledFeatures] = useState(school.disabledFeatures || []);
  const [savingKey, setSavingKey] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [formError, setFormError] = useState('');

  const handleToggle = async (key, enabled) => {
    const next = enabled ? disabledFeatures.filter((k) => k !== key) : [...disabledFeatures, key];
    setSavingKey(key);
    setFormError('');
    try {
      const updated = await updateSchoolFeatures(school.id, next);
      setDisabledFeatures(updated.disabledFeatures);
      setToastMessage(`${FEATURE_FLAGS.find((f) => f.key === key)?.label} ${enabled ? 'enabled' : 'disabled'} for this school.`);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSavingKey('');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
      <div className="flex items-center gap-4 mb-6">
        <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-violet-100 text-violet-600 shrink-0">
          <FiToggleRight className="w-5 h-5" />
        </span>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Module Access</h3>
          <p className="text-sm text-gray-500 mt-0.5">Turn optional modules on or off for this school.</p>
        </div>
      </div>

      {formError && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-4">{formError}</p>
      )}

      <div className="bg-gray-50 rounded-2xl p-6 space-y-5">
        {FEATURE_FLAGS.map((feature) => (
          <Toggle
            key={feature.key}
            label={feature.label}
            description={feature.description}
            checked={!disabledFeatures.includes(feature.key)}
            onChange={(enabled) => handleToggle(feature.key, enabled)}
            disabled={savingKey === feature.key}
          />
        ))}
      </div>

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}
