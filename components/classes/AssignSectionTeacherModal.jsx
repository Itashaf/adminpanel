'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FiUser } from 'react-icons/fi';
import Modal from '@/components/Modal';
import Dropdown from '@/components/Dropdown';
import Button from '@/components/Button';
import { assignSectionTeacherSchema } from '@/lib/schemas';
import { assignSectionTeacher } from '@/lib/api';

export default function AssignSectionTeacherModal({ isOpen, onClose, classId, section, teacherOptions, onSuccess }) {
  const [formError, setFormError] = useState('');

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(assignSectionTeacherSchema),
    defaultValues: { classTeacherId: '' },
  });

  useEffect(() => {
    if (!isOpen) return;
    reset({ classTeacherId: section?.classTeacherId || '' });
    setFormError('');
  }, [isOpen, section, reset]);

  const handleClose = () => {
    setFormError('');
    onClose();
  };

  const onSubmit = async (data) => {
    setFormError('');
    try {
      await assignSectionTeacher(classId, section.id, data.classTeacherId);
      onSuccess?.('Class teacher assigned successfully.');
    } catch (err) {
      setFormError(err.message);
    }
  };

  return (
    <Modal
      title="Assign Class Teacher"
      description={section ? `Choose the class teacher for Section ${section.name}.` : ''}
      isOpen={isOpen}
      onClose={handleClose}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {formError && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{formError}</p>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Class Teacher</label>
          <Controller
            name="classTeacherId"
            control={control}
            render={({ field }) => (
              <Dropdown
                placeholder="Select teacher"
                icon={<FiUser className="w-4 h-4" />}
                options={teacherOptions}
                value={field.value}
                onChange={field.onChange}
                error={errors.classTeacherId?.message}
                searchable
              />
            )}
          />
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
          <div className="w-full sm:w-auto">
            <Button label="Cancel" type="button" variant="secondary" onClick={handleClose} fullWidth />
          </div>
          <Button type="submit" label={isSubmitting ? 'Assigning...' : 'Assign'} disabled={isSubmitting} fullWidth={false} />
        </div>
      </form>
    </Modal>
  );
}
