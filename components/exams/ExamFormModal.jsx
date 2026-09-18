'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FiCalendar, FiFileText, FiLayers } from 'react-icons/fi';
import Modal from '@/components/Modal';
import Input from '@/components/Input';
import Dropdown from '@/components/Dropdown';
import DatePicker from '@/components/DatePicker';
import Button from '@/components/Button';
import { examSchema } from '@/lib/schemas';
import { createExam, updateExam, getExams } from '@/lib/api';
import { useClassSections } from '@/lib/hooks/useClassSections';

const RETAKE_RESULT_POLICIES = ['Best', 'Latest', 'Average'];
const RETAKE_POLICY_HINT = {
  Best: 'The higher percentage of the two exams counts.',
  Latest: "This retake's own result counts, whenever it exists.",
  Average: 'The two exams are averaged together.',
};

const EMPTY_VALUES = {
  name: '',
  academicSession: '',
  examType: '',
  startDate: '',
  endDate: '',
  classes: [],
  description: '',
  parentExamId: '',
  retakeResultPolicy: 'Latest',
};

export default function ExamFormModal({ isOpen, onClose, exam, sessionOptions, defaultSession, examTypeOptions = [], onSuccess }) {
  const isEdit = Boolean(exam);
  const [formError, setFormError] = useState('');
  const [isRetake, setIsRetake] = useState(false);
  const [otherExams, setOtherExams] = useState([]);
  const classSections = useClassSections();
  const classOptions = Object.keys(classSections);

  useEffect(() => {
    if (!isOpen) return;
    getExams()
      .then((all) => setOtherExams(all.filter((e) => e.id !== exam?.id)))
      .catch(() => setOtherExams([]));
  }, [isOpen, exam?.id]);

  const {
    handleSubmit,
    watch,
    control,
    register,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(examSchema), defaultValues: EMPTY_VALUES });

  const selectedClasses = watch('classes') || [];
  const allClassesSelected = classOptions.length > 0 && classOptions.every((c) => selectedClasses.includes(c));
  const toggleAllClasses = () => {
    setValue('classes', allClassesSelected ? [] : classOptions, { shouldValidate: true });
  };

  useEffect(() => {
    if (!isOpen) return;
    reset(
      isEdit
        ? {
            name: exam.name,
            academicSession: exam.academicSession,
            examType: exam.examType,
            startDate: exam.startDate,
            endDate: exam.endDate,
            classes: exam.classes || [],
            description: exam.description || '',
            parentExamId: exam.parentExamId || '',
            retakeResultPolicy: exam.retakeResultPolicy || 'Latest',
          }
        : { ...EMPTY_VALUES, academicSession: defaultSession || '' }
    );
    setIsRetake(Boolean(isEdit && exam.parentExamId));
    setFormError('');
  }, [isOpen, isEdit, exam, defaultSession, reset]);

  const handleClose = () => {
    setFormError('');
    onClose();
  };

  const onSubmit = async (data) => {
    setFormError('');
    try {
      if (isEdit) {
        await updateExam(exam.id, data);
      } else {
        await createExam(data);
      }
      onSuccess?.(isEdit ? 'Exam updated successfully.' : 'Exam created successfully.');
    } catch (err) {
      setFormError(err.message);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Edit Exam' : 'Create Exam'}
      description={isEdit ? 'Update this exam’s details.' : 'Set up a new exam for one or more classes.'}
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
            form="exam-form"
            label={isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Exam'}
            disabled={isSubmitting}
          />
        </div>
      }
    >
      <form id="exam-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 py-1">
        {formError && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{formError}</p>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Exam Name <span className="text-red-500">*</span>
          </label>
          <Input placeholder="e.g. Half Yearly Examination" error={errors.name?.message} {...register('name')} />
        </div>

        <div className="grid grid-cols-2 gap-4">
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
                  options={sessionOptions}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.academicSession?.message}
                />
              )}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Exam Type <span className="text-red-500">*</span>
            </label>
            <Controller
              name="examType"
              control={control}
              render={({ field }) => (
                <Dropdown
                  placeholder="Select or type a type"
                  icon={<FiFileText className="w-4 h-4" />}
                  options={examTypeOptions}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.examType?.message}
                  searchable
                  creatable
                />
              )}
            />
            <p className="text-xs text-gray-400 mt-1.5">Don't see it? Just type your own, e.g. SA1, FA1, PT1.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date <span className="text-red-500">*</span>
            </label>
            <Controller
              name="startDate"
              control={control}
              render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} error={errors.startDate?.message} />}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date <span className="text-red-500">*</span>
            </label>
            <Controller
              name="endDate"
              control={control}
              render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} error={errors.endDate?.message} />}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <FiLayers className="w-4 h-4 text-gray-400" />
              Applicable Classes <span className="text-red-500">*</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={allClassesSelected}
                onChange={toggleAllClasses}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              Select all
            </label>
          </div>
          <Controller
            name="classes"
            control={control}
            render={({ field }) => (
              <div className="border border-gray-200 rounded-xl p-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {classOptions.map((className) => {
                    const isSelected = field.value?.includes(className);
                    return (
                      <label
                        key={className}
                        className={`flex items-center gap-2 text-sm rounded-lg border px-3 py-2 cursor-pointer transition ${
                          isSelected ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected || false}
                          onChange={() =>
                            field.onChange(
                              isSelected ? field.value.filter((c) => c !== className) : [...(field.value || []), className]
                            )
                          }
                          className="sr-only"
                        />
                        {className}
                      </label>
                    );
                  })}
                </div>
                {classOptions.length === 0 && <p className="text-xs text-gray-400 py-2">No classes found for this school yet.</p>}
              </div>
            )}
          />
          {errors.classes && <p className="text-xs text-red-500 mt-1">{errors.classes.message}</p>}
        </div>

        <div className="border border-gray-200 rounded-xl p-4 space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={isRetake}
              onChange={(e) => {
                const checked = e.target.checked;
                setIsRetake(checked);
                if (!checked) {
                  setValue('parentExamId', '');
                  setValue('retakeResultPolicy', 'Latest');
                }
              }}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            This is a Re-Test / Improvement / Supplementary exam
          </label>

          {isRetake && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Original Exam</label>
                <Controller
                  name="parentExamId"
                  control={control}
                  render={({ field }) => (
                    <Dropdown
                      placeholder="Select the exam being retaken"
                      options={otherExams.map((e) => ({ value: e.id, label: e.name }))}
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.parentExamId?.message}
                      searchable
                    />
                  )}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Result Policy</label>
                <Controller
                  name="retakeResultPolicy"
                  control={control}
                  render={({ field }) => (
                    <Dropdown
                      options={RETAKE_RESULT_POLICIES.map((p) => ({ value: p, label: p }))}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
                <p className="text-xs text-gray-400 mt-1.5">{RETAKE_POLICY_HINT[watch('retakeResultPolicy')] || ''}</p>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description / Instructions</label>
          <textarea
            {...register('description')}
            rows={3}
            placeholder="Any instructions for this exam..."
            className="w-full py-2.5 px-4 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>
      </form>
    </Modal>
  );
}
