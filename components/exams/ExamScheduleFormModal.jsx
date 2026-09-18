'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FiBook, FiLayers, FiGrid, FiCalendar, FiHash, FiMapPin, FiUser, FiChevronDown } from 'react-icons/fi';
import Modal from '@/components/Modal';
import Input from '@/components/Input';
import Dropdown from '@/components/Dropdown';
import DatePicker from '@/components/DatePicker';
import TimePicker from '@/components/TimePicker';
import Button from '@/components/Button';
import { examScheduleSchema, examScheduleBulkSchema } from '@/lib/schemas';
import { EXAM_MODES } from '@/lib/examConstants';
import { addExamSchedule, updateExamSchedule } from '@/lib/api';
import { useClassSections, getSectionOptions } from '@/lib/hooks/useClassSections';
import { useSubjects } from '@/lib/hooks/useSubjects';

const MARKING_TYPES = ['Numeric', 'Grade', 'Remarks'];

function formatDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

const EMPTY_VALUES = {
  subject: '',
  classes: [],
  className: '',
  sectionName: '',
  examDate: '',
  startTime: '',
  endTime: '',
  maxMarks: '',
  passingMarks: '',
  examMode: 'Theory',
  room: '',
  invigilator: '',
  markingType: 'Numeric',
  hasPractical: false,
  practicalMaxMarks: '',
  practicalPassingMarks: '',
  isOptional: false,
  weight: 1,
};

// Adding a subject picks one or more classes at once (checkbox grid, same
// "Select all" pattern as ExamFormModal's Applicable Classes) — one form
// submission schedules the same subject+date+marks for every class picked,
// instead of an admin re-opening this modal once per class with identical
// values. Editing an existing row stays single-class, since a row already
// belongs to exactly one class+section.
export default function ExamScheduleFormModal({ isOpen, onClose, examId, examClasses, examStartDate, examEndDate, schedule, onSuccess }) {
  const isEdit = Boolean(schedule);
  const [formError, setFormError] = useState('');
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const classSections = useClassSections();
  const subjectOptions = useSubjects();

  const {
    handleSubmit,
    watch,
    control,
    register,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(isEdit ? examScheduleSchema : examScheduleBulkSchema), defaultValues: EMPTY_VALUES });

  const markingType = watch('markingType');
  const hasPractical = watch('hasPractical');
  const selectedClasses = watch('classes') || [];
  const selectedClass = isEdit ? watch('className') : selectedClasses.length === 1 ? selectedClasses[0] : '';
  const sectionApplies = isEdit || selectedClasses.length === 1;
  const sectionOptions = selectedClass
    ? [{ value: '', label: 'Whole Class (all sections)' }, ...getSectionOptions(classSections, selectedClass)]
    : [];
  const allClassesSelected = (examClasses?.length || 0) > 0 && examClasses.every((c) => selectedClasses.includes(c));

  useEffect(() => {
    if (!isOpen) return;
    reset(
      isEdit
        ? {
            ...EMPTY_VALUES,
            subject: schedule.subject,
            className: schedule.className,
            sectionName: schedule.sectionName || '',
            examDate: schedule.examDate,
            startTime: schedule.startTime || '',
            endTime: schedule.endTime || '',
            maxMarks: schedule.maxMarks,
            passingMarks: schedule.passingMarks,
            examMode: schedule.examMode || 'Theory',
            room: schedule.room || '',
            invigilator: schedule.invigilator || '',
            markingType: schedule.markingType || 'Numeric',
            hasPractical: schedule.hasPractical || false,
            practicalMaxMarks: schedule.practicalMaxMarks || '',
            practicalPassingMarks: schedule.practicalPassingMarks || '',
            isOptional: schedule.isOptional || false,
            weight: schedule.weight ?? 1,
          }
        : { ...EMPTY_VALUES, classes: examClasses?.length === 1 ? [...examClasses] : [] }
    );
    setFormError('');
    setShowMoreOptions(false);
  }, [isOpen, isEdit, schedule, examClasses, reset]);

  // Grade/Remarks subjects never feed the numeric total (see ExamSchedule's
  // markingType comment), so Maximum/Passing Marks are meaningless to a
  // teacher — auto-fill a placeholder and hide the fields instead of forcing
  // an admin to type numbers nobody will ever see.
  useEffect(() => {
    if (!isOpen) return;
    if (markingType !== 'Numeric') {
      setValue('maxMarks', 100);
      setValue('passingMarks', 0);
    }
  }, [isOpen, markingType, setValue]);

  const toggleAllClasses = () => {
    setValue('classes', allClassesSelected ? [] : [...examClasses], { shouldValidate: true });
    setValue('sectionName', '');
  };

  const handleClose = () => {
    setFormError('');
    onClose();
  };

  const onSubmit = async (data) => {
    setFormError('');
    try {
      if (isEdit) {
        await updateExamSchedule(schedule.id, data);
        onSuccess?.('Subject schedule updated successfully.');
        return;
      }

      const { classes, className, ...rest } = data;
      const sectionName = classes.length === 1 ? data.sectionName : '';
      const results = await Promise.allSettled(classes.map((cls) => addExamSchedule(examId, { ...rest, className: cls, sectionName })));
      const failedClasses = classes.filter((_, i) => results[i].status === 'rejected');
      const succeededCount = classes.length - failedClasses.length;

      if (succeededCount === 0) {
        setFormError(results[0].reason?.message || 'Failed to add subject.');
        return;
      }

      onSuccess?.(
        failedClasses.length > 0
          ? `Added to ${succeededCount} of ${classes.length} classes. Already scheduled for: ${failedClasses.join(', ')}.`
          : `${data.subject} added to the schedule for ${succeededCount} class${succeededCount === 1 ? '' : 'es'}.`
      );
    } catch (err) {
      setFormError(err.message);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Edit Subject Schedule' : 'Add Subject'}
      description={isEdit ? 'Update the date, time, and marks for this subject.' : 'Add a subject to one or more classes at once.'}
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
            form="exam-schedule-form"
            label={isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Subject'}
            disabled={isSubmitting}
          />
        </div>
      }
    >
      <form id="exam-schedule-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 py-1">
        {formError && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{formError}</p>
        )}

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
                options={subjectOptions.map((s) => ({ value: s, label: s }))}
                value={field.value}
                onChange={field.onChange}
                error={errors.subject?.message}
                searchable
              />
            )}
          />
        </div>

        {isEdit ? (
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
                  options={(examClasses || []).map((c) => ({ value: c, label: c }))}
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value);
                    setValue('sectionName', '');
                  }}
                  error={errors.className?.message}
                />
              )}
            />
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <FiLayers className="w-4 h-4 text-gray-400" />
                Classes <span className="text-red-500">*</span>
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
                    {(examClasses || []).map((className) => {
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
                            onChange={() => {
                              field.onChange(isSelected ? field.value.filter((c) => c !== className) : [...(field.value || []), className]);
                              setValue('sectionName', '');
                            }}
                            className="sr-only"
                          />
                          {className}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            />
            {errors.classes && <p className="text-xs text-red-500 mt-1">{errors.classes.message}</p>}
            <p className="text-xs text-gray-400 mt-1.5">
              {selectedClasses.length > 1
                ? 'Scheduling for the whole class in each — pick one class above to also choose a section.'
                : 'Pick a section below, or leave it as "Whole Class" to cover every section.'}
            </p>
          </div>
        )}

        {sectionApplies && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
            <Controller
              name="sectionName"
              control={control}
              render={({ field }) => (
                <Dropdown
                  placeholder={selectedClass ? 'Whole Class (all sections)' : 'Select a class first'}
                  icon={<FiGrid className="w-4 h-4" />}
                  options={sectionOptions}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={!selectedClass}
                />
              )}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Exam Date <span className="text-red-500">*</span>
            </label>
            <Controller
              name="examDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.examDate?.message}
                  minDate={examStartDate}
                  maxDate={examEndDate}
                />
              )}
            />
            {examStartDate && examEndDate && (
              <p className="text-xs text-gray-400 mt-1.5">
                Must fall within the exam window: {formatDate(examStartDate)} – {formatDate(examEndDate)}.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mode</label>
            <Controller
              name="examMode"
              control={control}
              render={({ field }) => (
                <Dropdown
                  options={EXAM_MODES.map((m) => ({ value: m, label: m }))}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
        </div>

        {markingType === 'Numeric' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Marks <span className="text-red-500">*</span>
              </label>
              <Input type="number" min="1" icon={<FiHash className="w-4 h-4" />} error={errors.maxMarks?.message} {...register('maxMarks')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Passing Marks <span className="text-red-500">*</span>
              </label>
              <Input type="number" min="0" icon={<FiHash className="w-4 h-4" />} error={errors.passingMarks?.message} {...register('passingMarks')} />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Marking Type</label>
          <Controller
            name="markingType"
            control={control}
            render={({ field }) => (
              <div className="flex gap-2">
                {MARKING_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => field.onChange(type)}
                    className={`flex-1 py-2.5 rounded-lg font-medium text-sm border transition cursor-pointer ${
                      field.value === type
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}
          />
          {markingType !== 'Numeric' && (
            <p className="text-xs text-gray-400 mt-1.5">
              Teachers enter a {markingType === 'Grade' ? 'letter grade (A/B/C...)' : 'remark'} instead of a number for this subject — no
              Maximum/Passing Marks needed, and it won't count toward the numeric total/percentage in results.
            </p>
          )}
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowMoreOptions((prev) => !prev)}
            className="flex items-center gap-1.5 text-sm font-medium text-indigo-700 hover:text-indigo-800 cursor-pointer"
          >
            More options (time, room, practical, optional, weight)
            <FiChevronDown className={`w-4 h-4 transition-transform ${showMoreOptions ? 'rotate-180' : ''}`} />
          </button>

          {showMoreOptions && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                  <Controller
                    name="startTime"
                    control={control}
                    render={({ field }) => <TimePicker value={field.value} onChange={field.onChange} />}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                  <Controller
                    name="endTime"
                    control={control}
                    render={({ field }) => <TimePicker value={field.value} onChange={field.onChange} />}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-3 space-y-3">
                <Controller
                  name="hasPractical"
                  control={control}
                  render={({ field }) => (
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.value || false}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      Has a separate practical component
                    </label>
                  )}
                />
                {hasPractical && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Practical Max Marks</label>
                      <Input
                        type="number"
                        min="1"
                        icon={<FiHash className="w-4 h-4" />}
                        error={errors.practicalMaxMarks?.message}
                        {...register('practicalMaxMarks')}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Practical Passing Marks</label>
                      <Input
                        type="number"
                        min="0"
                        icon={<FiHash className="w-4 h-4" />}
                        error={errors.practicalPassingMarks?.message}
                        {...register('practicalPassingMarks')}
                      />
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-400">Theory and practical are entered and passed independently.</p>
              </div>

              <div className="grid grid-cols-2 gap-4 items-start">
                <div>
                  <Controller
                    name="isOptional"
                    control={control}
                    render={({ field }) => (
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer mt-2">
                        <input
                          type="checkbox"
                          checked={field.value || false}
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        Optional / elective subject
                      </label>
                    )}
                  />
                  <p className="text-xs text-gray-400 mt-1">Only enrolled students see this in their sheet.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Weight</label>
                  <Input type="number" min="0.1" step="0.1" icon={<FiHash className="w-4 h-4" />} error={errors.weight?.message} {...register('weight')} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Room / Venue</label>
                  <Input placeholder="e.g. Room 4" icon={<FiMapPin className="w-4 h-4" />} {...register('room')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Invigilator</label>
                  <Input placeholder="e.g. Mrs. Sharma" icon={<FiUser className="w-4 h-4" />} {...register('invigilator')} />
                </div>
              </div>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
