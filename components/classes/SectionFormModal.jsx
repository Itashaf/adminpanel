'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FiUser, FiHome, FiUsers, FiCheckSquare } from 'react-icons/fi';
import Modal from '@/components/Modal';
import Input from '@/components/Input';
import Dropdown from '@/components/Dropdown';
import Button from '@/components/Button';
import { sectionSchema } from '@/lib/schemas';
import { SECTION_STATUSES } from '@/lib/classConstants';
import { createSection, updateSection } from '@/lib/api';

const EMPTY_VALUES = { name: '', classTeacherId: '', room: '', capacity: '', status: 'Active' };

export default function SectionFormModal({ isOpen, onClose, classId, className, academicSession, section, teacherOptions, onSuccess }) {
  const isEdit = Boolean(section);
  const [formError, setFormError] = useState('');

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(sectionSchema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    if (!isOpen) return;
    reset(
      isEdit
        ? {
            name: section.name,
            classTeacherId: section.classTeacherId || '',
            room: section.room || '',
            capacity: String(section.capacity ?? ''),
            status: section.status,
          }
        : EMPTY_VALUES
    );
    setFormError('');
  }, [isOpen, isEdit, section, reset]);

  const handleClose = () => {
    setFormError('');
    onClose();
  };

  const onSubmit = async (data) => {
    setFormError('');
    try {
      if (isEdit) {
        await updateSection(classId, section.id, data);
      } else {
        await createSection(classId, data);
      }
      onSuccess?.(isEdit ? 'Section updated successfully.' : 'Section added successfully.');
    } catch (err) {
      setFormError(err.message);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Edit Section' : 'Add Section'}
      description={isEdit ? 'Update this section’s details.' : `Create a new section under ${className}.`}
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      footer={
        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <div className="w-full sm:w-auto">
            <Button label="Cancel" type="button" variant="secondary" onClick={handleClose} fullWidth />
          </div>
          <Button
            type="submit"
            form="section-form"
            label={isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Section'}
            disabled={isSubmitting}
          />
        </div>
      }
    >
      <form id="section-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 py-1">
        {formError && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{formError}</p>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Section Name <span className="text-red-500">*</span>
          </label>
          <Controller
            name="name"
            control={control}
            render={({ field }) => <Input {...field} placeholder="e.g. A" error={errors.name?.message} />}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
            <Input value={className} disabled readOnly />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Academic Session</label>
            <Input value={academicSession} disabled readOnly />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Class Teacher</label>
          <Controller
            name="classTeacherId"
            control={control}
            render={({ field }) => (
              <Dropdown
                placeholder="Select teacher (optional)"
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Room Number</label>
            <Controller
              name="room"
              control={control}
              render={({ field }) => (
                <Input {...field} icon={<FiHome className="w-4 h-4" />} placeholder="e.g. 204" error={errors.room?.message} />
              )}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Capacity <span className="text-red-500">*</span>
            </label>
            <Controller
              name="capacity"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="number"
                  min="1"
                  icon={<FiUsers className="w-4 h-4" />}
                  placeholder="e.g. 40"
                  error={errors.capacity?.message}
                />
              )}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Dropdown
                placeholder="Select status"
                icon={<FiCheckSquare className="w-4 h-4" />}
                options={SECTION_STATUSES.map((status) => ({ value: status, label: status }))}
                value={field.value}
                onChange={field.onChange}
                error={errors.status?.message}
              />
            )}
          />
        </div>
      </form>
    </Modal>
  );
}
