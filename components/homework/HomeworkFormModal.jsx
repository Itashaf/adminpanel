'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FiLayers, FiGrid, FiBook } from 'react-icons/fi';
import Modal from '@/components/Modal';
import Input from '@/components/Input';
import Dropdown from '@/components/Dropdown';
import Button from '@/components/Button';
import { buildHomeworkSchema } from '@/lib/schemas';
import { createHomework, updateHomework } from '@/lib/api';
import { useClassSections, getSectionOptions } from '@/lib/hooks/useClassSections';
import { useSubjects } from '@/lib/hooks/useSubjects';

const EMPTY_VALUES = {
  academicSession: '',
  className: '',
  sectionName: '',
  subject: '',
  title: '',
  description: '',
};

export default function HomeworkFormModal({ isOpen, onClose, homework, defaultSession, currentUser, onSuccess }) {
  const isEdit = Boolean(homework);
  const isTeacher = currentUser.role === 'Teacher';
  const [formError, setFormError] = useState('');
  const classSections = useClassSections();
  const allSubjects = useSubjects();
  const resolver = useMemo(() => zodResolver(buildHomeworkSchema(classSections)), [classSections]);

  const {
    handleSubmit,
    watch,
    control,
    register,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ resolver, defaultValues: EMPTY_VALUES });

  const selectedClass = watch('className');
  const selectedSection = watch('sectionName');

  const classOptions = useMemo(() => {
    if (isTeacher) {
      return [...new Set((currentUser.assignedClasses || []).map((a) => a.class))].map((c) => ({ value: c, label: c }));
    }
    return Object.keys(classSections).map((c) => ({ value: c, label: c }));
  }, [isTeacher, currentUser.assignedClasses, classSections]);

  const sectionOptions = useMemo(() => {
    if (!selectedClass) return [];
    if (isTeacher) {
      return (currentUser.assignedClasses || [])
        .filter((a) => a.class === selectedClass)
        .map((a) => ({ value: a.section, label: `Section ${a.section}` }));
    }
    return getSectionOptions(classSections, selectedClass);
  }, [selectedClass, isTeacher, currentUser.assignedClasses, classSections]);

  // A Teacher only sees the subject(s) they're actually assigned to teach
  // for this exact class+section (see AssignClassModal.jsx's per-assignment
  // subject) — never the full subject list, since lib/homework.js's
  // assertScopeAllowed would reject any other subject anyway. Falls back to
  // every subject when this teacher's assignment here has no subject set at
  // all (a Class Teacher's general assignment, which the backend does allow
  // to post any subject) so they aren't blocked from picking one.
  const subjectOptions = useMemo(() => {
    const allOptions = allSubjects.map((s) => ({ value: s, label: s }));
    if (!isTeacher) return allOptions;

    const subjectsHere = [
      ...new Set(
        (currentUser.assignedClasses || [])
          .filter((a) => a.class === selectedClass && a.section === selectedSection && a.subject)
          .map((a) => a.subject)
      ),
    ];
    return subjectsHere.length > 0 ? subjectsHere.map((s) => ({ value: s, label: s })) : allOptions;
  }, [allSubjects, isTeacher, currentUser.assignedClasses, selectedClass, selectedSection]);

  useEffect(() => {
    if (!isOpen) return;
    reset(
      isEdit
        ? {
            academicSession: homework.academicSession,
            className: homework.className,
            sectionName: homework.sectionName,
            subject: homework.subject,
            title: homework.title,
            description: homework.description || '',
          }
        : { ...EMPTY_VALUES, academicSession: defaultSession || '' }
    );
    setFormError('');
  }, [isOpen, isEdit, homework, defaultSession, reset]);

  const handleClassChange = (value, onChange) => {
    onChange(value);
    setValue('sectionName', '');
    setValue('subject', '');
  };

  const handleSectionChange = (value, onChange) => {
    onChange(value);
    setValue('subject', '');
  };

  const handleClose = () => {
    setFormError('');
    onClose();
  };

  const onSubmit = async (data) => {
    setFormError('');
    try {
      const payload = { ...data, academicSession: isEdit ? homework.academicSession : defaultSession };
      if (isEdit) {
        await updateHomework(homework.id, payload);
      } else {
        await createHomework(payload);
      }
      onSuccess?.(isEdit ? 'Homework updated successfully.' : 'Homework assigned successfully.');
    } catch (err) {
      setFormError(err.message);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Edit Homework' : 'Assign Homework'}
      description={isEdit ? 'Update this homework’s details.' : 'Assign homework to a class and section.'}
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
            form="homework-form"
            label={isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Assign Homework'}
            disabled={isSubmitting}
          />
        </div>
      }
    >
      <form id="homework-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 py-1">
        {formError && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{formError}</p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Class <span className="text-red-500">*</span>
            </label>
            <Controller
              name="className"
              control={control}
              render={({ field }) => (
                <Dropdown
                  placeholder="Select class"
                  icon={<FiLayers className="w-4 h-4" />}
                  options={classOptions}
                  value={field.value}
                  onChange={(value) => handleClassChange(value, field.onChange)}
                  error={errors.className?.message}
                  searchable
                />
              )}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Section {sectionOptions.length > 0 && <span className="text-red-500">*</span>}
            </label>
            <Controller
              name="sectionName"
              control={control}
              render={({ field }) => (
                <Dropdown
                  placeholder={
                    !selectedClass ? 'Select a class first' : sectionOptions.length === 0 ? 'No sections for this class' : 'Select section'
                  }
                  icon={<FiGrid className="w-4 h-4" />}
                  options={sectionOptions}
                  value={field.value}
                  onChange={(value) => handleSectionChange(value, field.onChange)}
                  disabled={!selectedClass || sectionOptions.length === 0}
                  error={errors.sectionName?.message}
                />
              )}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subject <span className="text-red-500">*</span>
          </label>
          <Controller
            name="subject"
            control={control}
            render={({ field }) => (
              <Dropdown
                placeholder="Select subject"
                icon={<FiBook className="w-4 h-4" />}
                options={subjectOptions}
                value={field.value}
                onChange={field.onChange}
                error={errors.subject?.message}
                searchable
              />
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title <span className="text-red-500">*</span>
          </label>
          <Input placeholder="e.g. Chapter 4 Exercise 4.2" error={errors.title?.message} {...register('title')} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            {...register('description')}
            rows={3}
            placeholder="Instructions for the homework..."
            className="w-full py-2.5 px-4 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>
      </form>
    </Modal>
  );
}
