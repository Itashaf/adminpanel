'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FiCalendar, FiCheckSquare, FiLayers } from 'react-icons/fi';
import Modal from '@/components/Modal';
import Input from '@/components/Input';
import Dropdown from '@/components/Dropdown';
import Button from '@/components/Button';
import { classSchema } from '@/lib/schemas';
import { ACADEMIC_SESSIONS } from '@/lib/students';
import { CLASS_STATUSES, CLASS_LEVELS, classNameForLevel } from '@/lib/classConstants';
import { createClass, updateClass } from '@/lib/api';
import { useSubjects } from '@/lib/hooks/useSubjects';

const EMPTY_VALUES = { level: '', academicSession: '', status: 'Active', subjects: [] };

export default function ClassFormModal({ isOpen, onClose, cls, defaultSession, onSuccess }) {
  const isEdit = Boolean(cls);
  const [formError, setFormError] = useState('');
  const subjectOptions = useSubjects();

  const {
    handleSubmit,
    watch,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(classSchema),
    defaultValues: EMPTY_VALUES,
  });

  const selectedLevel = watch('level');

  useEffect(() => {
    if (!isOpen) return;
    reset(
      isEdit
        ? {
            level: cls.level,
            academicSession: cls.academicSession,
            status: cls.status,
            subjects: cls.subjects || [],
          }
        : { ...EMPTY_VALUES, academicSession: defaultSession || '' }
    );
    setFormError('');
  }, [isOpen, isEdit, cls, defaultSession, reset]);

  const handleClose = () => {
    setFormError('');
    onClose();
  };

  const onSubmit = async (data) => {
    setFormError('');
    try {
      if (isEdit) {
        await updateClass(cls.id, data);
      } else {
        await createClass(data);
      }
      onSuccess?.(isEdit ? 'Class updated successfully.' : 'Class created successfully.');
    } catch (err) {
      setFormError(err.message);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Edit Class' : 'Add Class'}
      description={isEdit ? 'Update this class’s details.' : 'Create a new class for the selected academic session.'}
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
            form="class-form"
            label={isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Class'}
            disabled={isSubmitting}
          />
        </div>
      }
    >
      <form id="class-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 py-1">
        {formError && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{formError}</p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Class Level <span className="text-red-500">*</span>
            </label>
            <Controller
              name="level"
              control={control}
              render={({ field }) => (
                <Dropdown
                  placeholder="Select level"
                  icon={<FiLayers className="w-4 h-4" />}
                  options={CLASS_LEVELS.map((level) => ({ value: level, label: level }))}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.level?.message}
                  searchable
                />
              )}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Academic Session <span className="text-red-500">*</span>
            </label>
            <Controller
              name="academicSession"
              control={control}
              render={({ field }) => (
                <Dropdown
                  placeholder="Select session"
                  icon={<FiCalendar className="w-4 h-4" />}
                  options={ACADEMIC_SESSIONS.map((session) => ({ value: session, label: session }))}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.academicSession?.message}
                />
              )}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Class Name</label>
          <Input value={selectedLevel ? classNameForLevel(selectedLevel) : ''} placeholder="Select a level first" disabled readOnly />
          <p className="text-xs text-gray-400 mt-1.5">Class name is generated automatically from the selected level.</p>
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
                options={CLASS_STATUSES.map((status) => ({ value: status, label: status }))}
                value={field.value}
                onChange={field.onChange}
                error={errors.status?.message}
              />
            )}
          />
        </div>

        {isEdit && (
          <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-4 py-3">
            Class Teacher is assigned per section, not for the whole class — open a section's "Assign Class Teacher" action to set it.
          </p>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Subjects</label>
          <Controller
            name="subjects"
            control={control}
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {subjectOptions.map((subject) => {
                  const isSelected = field.value?.includes(subject);
                  return (
                    <button
                      key={subject}
                      type="button"
                      onClick={() =>
                        field.onChange(
                          isSelected ? field.value.filter((s) => s !== subject) : [...(field.value || []), subject]
                        )
                      }
                      className={`text-sm font-medium rounded-full px-3.5 py-1.5 border transition cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {subject}
                    </button>
                  );
                })}
              </div>
            )}
          />
        </div>
      </form>
    </Modal>
  );
}
