'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import { useSubjects } from '@/lib/hooks/useSubjects';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DURATION_OPTIONS = [15, 20, 25, 30, 35, 40, 45, 50, 60];
const BREAK_LABEL_PRESETS = ['Lunch Break', 'Recess', 'Assembly', 'Sports Period', 'Library'];

const EMPTY_VALUES = { day: 'Monday', type: 'Period', subject: '', teacherId: '', teacherName: '', duration: 40, label: '' };

// Every field here is a tap-chip, never a typed/searched dropdown — the
// whole point of this screen (see TimeTableClient.jsx) is that building a
// week's schedule should never feel like filling out a form.
export default function TimeTablePeriodModal({ isOpen, onClose, entry, defaultDay, teacherOptions, onSave, onDelete }) {
  const isEdit = Boolean(entry);
  const subjectOptions = useSubjects();
  const [values, setValues] = useState(EMPTY_VALUES);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setValues(
      entry
        ? { day: entry.day, type: entry.type, subject: entry.subject || '', teacherId: entry.teacherId || '', teacherName: entry.teacherName || '', duration: entry.duration || 40, label: entry.label || '' }
        : { ...EMPTY_VALUES, day: defaultDay || 'Monday' }
    );
    setFormError('');
  }, [isOpen, entry, defaultDay]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    if (values.type === 'Period' && !values.subject) {
      setFormError('Pick a subject for this period.');
      return;
    }
    if (values.type === 'Break' && !values.label.trim()) {
      setFormError('Pick or type a label for this break.');
      return;
    }
    onSave({
      id: entry?.id || `${Date.now()}`,
      day: values.day,
      type: values.type,
      subject: values.type === 'Period' ? values.subject : '',
      teacherId: values.type === 'Period' ? values.teacherId : '',
      teacherName: values.type === 'Period' ? values.teacherName : '',
      duration: values.duration,
      label: values.type === 'Break' ? values.label.trim() : '',
    });
  };

  return (
    <Modal
      title={isEdit ? 'Edit Period' : 'Add Period'}
      description="Tap to pick — nothing here needs typing."
      isOpen={isOpen}
      onClose={onClose}
      footer={
        <div className="flex flex-col sm:flex-row justify-between gap-3">
          {isEdit ? (
            <button
              type="button"
              onClick={() => onDelete(entry)}
              className="text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg px-4 py-2.5 transition cursor-pointer"
            >
              Remove
            </button>
          ) : (
            <span />
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="w-full sm:w-auto">
              <Button label="Cancel" type="button" variant="secondary" onClick={onClose} fullWidth />
            </div>
            <Button type="submit" form="timetable-period-form" label={isEdit ? 'Save Changes' : 'Add'} />
          </div>
        </div>
      }
    >
      <form id="timetable-period-form" onSubmit={handleSubmit} noValidate className="space-y-4 py-1">
        {formError && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{formError}</p>
        )}

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Day</p>
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => setValues((v) => ({ ...v, day }))}
                className={`text-xs font-medium rounded-full px-3 py-1.5 border transition cursor-pointer ${
                  values.day === day ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          {['Period', 'Break'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setValues((v) => ({ ...v, type }))}
              className={`flex-1 py-2.5 rounded-lg font-medium text-sm border transition cursor-pointer ${
                values.type === type ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {type === 'Period' ? 'Subject Period' : 'Break'}
            </button>
          ))}
        </div>

        {values.type === 'Period' ? (
          <>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Subject <span className="text-red-500">*</span>
              </p>
              <div className="max-h-40 overflow-y-auto flex flex-wrap gap-1.5">
                {subjectOptions.map((subject) => (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => setValues((v) => ({ ...v, subject }))}
                    className={`text-xs font-medium rounded-full px-2.5 py-1.5 border transition cursor-pointer ${
                      values.subject === subject ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {subject}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Teacher</p>
              <div className="max-h-32 overflow-y-auto flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setValues((v) => ({ ...v, teacherId: '', teacherName: '' }))}
                  className={`text-xs font-medium rounded-full px-2.5 py-1.5 border transition cursor-pointer ${
                    !values.teacherId ? 'bg-gray-800 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  No teacher
                </button>
                {teacherOptions.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setValues((v) => ({ ...v, teacherId: t.value, teacherName: t.label }))}
                    className={`text-xs font-medium rounded-full px-2.5 py-1.5 border transition cursor-pointer ${
                      values.teacherId === t.value ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Label <span className="text-red-500">*</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {BREAK_LABEL_PRESETS.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setValues((v) => ({ ...v, label }))}
                  className={`text-xs font-medium rounded-full px-2.5 py-1.5 border transition cursor-pointer ${
                    values.label === label ? 'bg-amber-600 border-amber-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Duration (minutes)</p>
          <div className="flex flex-wrap gap-1.5">
            {DURATION_OPTIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setValues((v) => ({ ...v, duration: d }))}
                className={`text-xs font-medium rounded-lg px-2.5 py-1.5 border transition cursor-pointer ${
                  values.duration === d ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}
