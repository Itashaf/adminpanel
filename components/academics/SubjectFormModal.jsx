'use client';

import { useEffect, useState } from 'react';
import { FiBook, FiHash, FiTag } from 'react-icons/fi';
import Modal from '@/components/Modal';
import Input from '@/components/Input';
import Dropdown from '@/components/Dropdown';
import Button from '@/components/Button';
import { addSubject, updateSubject } from '@/lib/api';

const SUBJECT_TYPES = ['Theory', 'Practical'];
const EMPTY_VALUES = { name: '', code: '', type: 'Theory' };

export default function SubjectFormModal({ isOpen, onClose, subject, onSuccess }) {
  const isEdit = Boolean(subject);
  const [values, setValues] = useState(EMPTY_VALUES);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setValues(isEdit ? { name: subject.name, code: subject.code, type: subject.type } : EMPTY_VALUES);
    setFormError('');
  }, [isOpen, isEdit, subject]);

  const handleClose = () => {
    setFormError('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);
    try {
      const result = isEdit ? await updateSubject(subject.id, values) : await addSubject(values);
      onSuccess?.(isEdit ? 'Subject updated successfully.' : 'Subject added successfully.', result);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Edit Subject' : 'Add Subject'}
      description={isEdit ? 'Update this subject’s details.' : 'Add a new subject to the master list.'}
      isOpen={isOpen}
      onClose={handleClose}
      footer={
        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <div className="w-full sm:w-auto">
            <Button label="Cancel" type="button" variant="secondary" onClick={handleClose} fullWidth />
          </div>
          <Button
            type="submit"
            form="subject-form"
            label={isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Subject'}
            disabled={isSubmitting || !values.name.trim()}
          />
        </div>
      }
    >
      <form id="subject-form" onSubmit={handleSubmit} noValidate className="space-y-4 py-1">
        {formError && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{formError}</p>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subject Name <span className="text-red-500">*</span>
          </label>
          <Input
            icon={<FiBook className="w-4 h-4" />}
            value={values.name}
            onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            placeholder="e.g. Sanskrit"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Code</label>
            <Input
              icon={<FiHash className="w-4 h-4" />}
              value={values.code}
              onChange={(e) => setValues((v) => ({ ...v, code: e.target.value }))}
              placeholder="e.g. San"
              maxLength={10}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <Dropdown
              icon={<FiTag className="w-4 h-4" />}
              options={SUBJECT_TYPES.map((t) => ({ value: t, label: t }))}
              value={values.type}
              onChange={(value) => setValues((v) => ({ ...v, type: value }))}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
