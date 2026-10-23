'use client';

import { useMemo, useState } from 'react';
import { FiBell } from 'react-icons/fi';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import Dropdown from '@/components/Dropdown';
import { useClassSections } from '@/lib/hooks/useClassSections';

const TARGETS = [
  { value: 'all', label: 'All students with pending fees', description: 'Every student with an unpaid balance, school-wide.' },
  { value: 'defaulters', label: 'Defaulters (overdue only)', description: 'Only students whose due date has already passed.' },
  { value: 'class', label: 'A specific class', description: 'Students with a pending balance in one class (optionally one section).' },
];

// "Send Fees Reminder" button's popup (StudentFeesExplorer.jsx) — picks WHO
// to remind before anything is sent, instead of silently reminding
// whatever the page's own filters happen to be set to. Each target group
// resolves to a real studentIds list (never trusted as given), then posts
// to the same /api/fees/send-reminder every per-row reminder uses.
export default function SendFeesReminderModal({ isOpen, onClose, onSent }) {
  const [target, setTarget] = useState('all');
  const [className, setClassName] = useState('');
  const [section, setSection] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  const classSections = useClassSections();
  const classOptions = useMemo(
    () => Object.keys(classSections).map((c) => ({ value: c, label: c })),
    [classSections]
  );
  const sectionOptions = useMemo(
    () => [{ value: '', label: 'All Sections' }, ...(classSections[className] || []).map((s) => ({ value: s, label: s }))],
    [classSections, className]
  );

  const reset = () => {
    setTarget('all');
    setClassName('');
    setSection('');
    setError('');
  };

  const handleClose = () => {
    if (isSending) return;
    reset();
    onClose();
  };

  const handleSend = async () => {
    setError('');
    if (target === 'class' && !className) {
      setError('Pick a class first.');
      return;
    }
    setIsSending(true);
    try {
      let studentIds;
      if (target === 'defaulters') {
        const res = await fetch('/api/fees/defaulters');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load defaulters');
        studentIds = data.studentIds;
      } else {
        const params = new URLSearchParams();
        if (target === 'class') {
          params.set('class', className);
          if (section) params.set('section', section);
        }
        const res = await fetch(`/api/fees/students/due-ids?${params}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load students');
        studentIds = data.studentIds;
      }

      if (studentIds.length === 0) {
        setError('No students with a pending fee due in this group.');
        return;
      }

      const res = await fetch('/api/fees/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reminders');

      onSent(data);
      reset();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Send Fees Reminder"
      description="Choose who to remind — every selected parent gets a push + in-app notification."
      icon={<FiBell className="w-5 h-5" />}
      footer={
        <div className="flex justify-end gap-3">
          <Button label="Cancel" variant="secondary" onClick={handleClose} disabled={isSending} fullWidth={false} />
          <Button label={isSending ? 'Sending...' : 'Send Reminder'} onClick={handleSend} disabled={isSending} fullWidth={false} />
        </div>
      }
    >
      {error && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-4">{error}</p>}

      <div className="space-y-2">
        {TARGETS.map((t) => (
          <label
            key={t.value}
            className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
              target === t.value ? 'border-indigo-300 bg-indigo-50/60' : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <input
              type="radio"
              name="reminderTarget"
              checked={target === t.value}
              onChange={() => setTarget(t.value)}
              className="mt-1 text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">{t.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
            </div>
          </label>
        ))}
      </div>

      {target === 'class' && (
        <div className="grid grid-cols-2 gap-3 mt-4">
          <Dropdown
            options={classOptions}
            value={className}
            onChange={(v) => {
              setClassName(v);
              setSection('');
            }}
            placeholder="Select class"
          />
          <Dropdown
            options={sectionOptions}
            value={section}
            onChange={setSection}
            placeholder="All sections"
            disabled={!className}
          />
        </div>
      )}
    </Modal>
  );
}
