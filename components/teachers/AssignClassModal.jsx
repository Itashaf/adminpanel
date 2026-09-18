'use client';

import { useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FiCalendar, FiLayers, FiGrid, FiBook } from 'react-icons/fi';
import Modal from '@/components/Modal';
import Dropdown from '@/components/Dropdown';
import Button from '@/components/Button';
import { buildAssignClassSchema } from '@/lib/schemas';
import { ACADEMIC_SESSIONS } from '@/lib/students';
import { assignClassToTeacher } from '@/lib/api';
import { useClassSections, getSectionOptions } from '@/lib/hooks/useClassSections';
import { useSubjects } from '@/lib/hooks/useSubjects';

export default function AssignClassModal({ isOpen, onClose, teacherId, existingAssignments = [], classOptions, onSuccess }) {
  const [formError, setFormError] = useState('');
  const classSections = useClassSections();
  const subjects = useSubjects();
  const subjectDropdownOptions = useMemo(
    () => [{ value: '', label: 'No specific subject' }, ...subjects.map((s) => ({ value: s, label: s }))],
    [subjects]
  );
  const resolver = useMemo(() => zodResolver(buildAssignClassSchema(classSections)), [classSections]);

  const {
    handleSubmit,
    watch,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver,
    defaultValues: { academicSession: '', class: '', section: '', subject: '' },
  });

  const selectedClass = watch('class');
  const sectionOptions = getSectionOptions(classSections, selectedClass);

  const handleClose = () => {
    reset({ academicSession: '', class: '', section: '', subject: '' });
    setFormError('');
    onClose();
  };

  const onSubmit = async (data) => {
    setFormError('');
    const isDuplicate = existingAssignments.some(
      (a) =>
        a.academicSession === data.academicSession &&
        a.class === data.class &&
        a.section === data.section &&
        (a.subject || '') === (data.subject || '')
    );
    if (isDuplicate) {
      setFormError('This teacher is already assigned to this class, section, and subject.');
      return;
    }

    try {
      await assignClassToTeacher(teacherId, data);
      reset({ academicSession: '', class: '', section: '', subject: '' });
      onSuccess?.();
    } catch (err) {
      setFormError(err.message);
    }
  };

  return (
    <Modal
      title="Assign Class"
      description="Assign this teacher to a class and section."
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      footer={
        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <div className="w-full sm:w-auto">
            <Button label="Cancel" type="button" variant="secondary" onClick={handleClose} fullWidth />
          </div>
          <Button type="submit" form="assign-class-form" label={isSubmitting ? 'Assigning...' : 'Assign'} disabled={isSubmitting} />
        </div>
      }
    >
      <form id="assign-class-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 py-1">
        {formError && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{formError}</p>
        )}

        <div>
          <label className="block text-left text-sm font-medium text-gray-700 mb-2">Academic Session</label>
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-left text-sm font-medium text-gray-700 mb-2">Class</label>
            <Controller
              name="class"
              control={control}
              render={({ field }) => (
                <Dropdown
                  placeholder="Select class"
                  icon={<FiLayers className="w-4 h-4" />}
                  options={classOptions}
                  value={field.value}
                  onChange={(next) => {
                    field.onChange(next);
                    setValue('section', '');
                  }}
                  error={errors.class?.message}
                />
              )}
            />
          </div>

          <div>
            <label className="block text-left text-sm font-medium text-gray-700 mb-2">Section</label>
            <Controller
              name="section"
              control={control}
              render={({ field }) => (
                <Dropdown
                  placeholder={
                    !selectedClass ? 'Select a class first' : sectionOptions.length === 0 ? 'No sections for this class' : 'Select section'
                  }
                  icon={<FiGrid className="w-4 h-4" />}
                  options={sectionOptions}
                  disabled={!selectedClass || sectionOptions.length === 0}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.section?.message}
                />
              )}
            />
          </div>
        </div>

        <div>
          <label className="block text-left text-sm font-medium text-gray-700 mb-2">Subject</label>
          <Controller
            name="subject"
            control={control}
            render={({ field }) => (
              <Dropdown
                icon={<FiBook className="w-4 h-4" />}
                options={subjectDropdownOptions}
                value={field.value}
                onChange={field.onChange}
                error={errors.subject?.message}
                searchable
              />
            )}
          />
          <p className="text-xs text-gray-400 mt-1.5">
            Pick the subject this teacher teaches here to let them assign that subject's homework — this class's own Class Teacher
            (set under Classes &amp; Sections) can always assign any subject regardless.
          </p>
        </div>
      </form>
    </Modal>
  );
}
