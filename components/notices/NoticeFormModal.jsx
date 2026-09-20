'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FiUsers, FiLayers, FiGrid, FiFlag, FiCalendar, FiPaperclip, FiX, FiUploadCloud } from 'react-icons/fi';
import Modal from '@/components/Modal';
import Input from '@/components/Input';
import Dropdown from '@/components/Dropdown';
import DatePicker from '@/components/DatePicker';
import Button from '@/components/Button';
import { noticeSchema } from '@/lib/schemas';
import { NOTICE_AUDIENCES, NOTICE_PRIORITIES, MAX_NOTICE_ATTACHMENT_BYTES } from '@/lib/noticeConstants';
import { createNotice, updateNotice, uploadNoticeAttachment } from '@/lib/api';
import { useClassSections, getSectionOptions } from '@/lib/hooks/useClassSections';

const EMPTY_VALUES = {
  title: '',
  message: '',
  audience: 'Whole School',
  academicSession: '',
  className: '',
  sectionName: '',
  priority: 'Normal',
  expiryDate: '',
};

// A compact row (not FileDropzone's large square preview — this modal has no
// vertical room to spare) — icon + filename/placeholder + a small remove
// affordance, capped at ~80px including its helper note.
function CompactAttachmentField({ value, onSelect, error }) {
  const inputRef = useRef(null);
  const fileName = value instanceof File ? value.name : value?.name;

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        className={`flex items-center gap-2 h-11 px-3 border rounded-xl cursor-pointer transition ${
          error ? 'border-red-300 bg-red-50/40' : 'border-gray-200 hover:border-gray-300 bg-white'
        }`}
      >
        {fileName ? <FiPaperclip className="w-4 h-4 text-indigo-600 shrink-0" /> : <FiUploadCloud className="w-4 h-4 text-gray-400 shrink-0" />}
        <span className={`text-sm truncate ${fileName ? 'text-gray-700' : 'text-gray-400'}`}>{fileName || 'Upload PDF'}</span>
        {fileName && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(null);
              if (inputRef.current) inputRef.current.value = '';
            }}
            className="ml-auto text-gray-300 hover:text-gray-500 cursor-pointer shrink-0"
          >
            <FiX className="w-3.5 h-3.5" />
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => onSelect(e.target.files?.[0] || null)}
        />
      </div>
      <p className="text-[11px] text-gray-400 mt-1">{error || 'PDF only, max 2MB'}</p>
    </div>
  );
}

export default function NoticeFormModal({ isOpen, onClose, notice, sessionOptions, defaultSession, currentUser, onSuccess }) {
  const isEdit = Boolean(notice);
  const isTeacher = currentUser.role === 'Teacher';
  const [formError, setFormError] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [attachmentError, setAttachmentError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const {
    handleSubmit,
    watch,
    control,
    register,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(noticeSchema), defaultValues: EMPTY_VALUES });

  const audience = watch('audience');
  const selectedClass = watch('className');

  // A Teacher can only ever post to one of their own Class-Teacher sections
  // — the audience is always "Class", never "Whole School", and the
  // class/section dropdowns only ever offer sections they're the Class
  // Teacher of (currentUser.classTeacherOf, from Section.classTeacherId),
  // never a class they merely teach a subject in (currentUser.assignedClasses
  // — that's Homework's, broader, rule, not Notices').
  const teacherClassOptions = useMemo(() => {
    if (!isTeacher) return [];
    return [...new Set((currentUser.classTeacherOf || []).map((a) => a.class))].map((c) => ({ value: c, label: c }));
  }, [isTeacher, currentUser.classTeacherOf]);

  const classSections = useClassSections();

  const classOptions = isTeacher
    ? teacherClassOptions
    : Object.keys(classSections).map((c) => ({ value: c, label: c }));

  const sectionOptions = useMemo(() => {
    if (!selectedClass) return [];
    if (isTeacher) {
      return (currentUser.classTeacherOf || [])
        .filter((a) => a.class === selectedClass)
        .map((a) => ({ value: a.section, label: `Section ${a.section}` }));
    }
    // Admin can also target the whole class (every section) by leaving this unset.
    return [{ value: '', label: 'All Sections' }, ...getSectionOptions(classSections, selectedClass)];
  }, [selectedClass, isTeacher, currentUser.classTeacherOf, classSections]);

  useEffect(() => {
    if (!isOpen) return;
    reset(
      isEdit
        ? {
            title: notice.title,
            message: notice.message,
            audience: notice.audience,
            academicSession: notice.academicSession || defaultSession || '',
            className: notice.className || '',
            sectionName: notice.sectionName || '',
            priority: notice.priority,
            expiryDate: notice.expiryDate || '',
          }
        : {
            ...EMPTY_VALUES,
            audience: isTeacher ? 'Class' : 'Whole School',
            academicSession: defaultSession || '',
          }
    );
    setAttachment(isEdit && notice.attachmentUrl ? { name: notice.attachmentName, url: notice.attachmentUrl, size: notice.attachmentSize } : null);
    setAttachmentError('');
    setFormError('');
  }, [isOpen, isEdit, notice, defaultSession, isTeacher, reset]);

  const handleAttachmentSelect = (file) => {
    setAttachmentError('');
    if (!file) {
      setAttachment(null);
      return;
    }
    if (file.type !== 'application/pdf') {
      setAttachmentError('Only PDF files are allowed.');
      return;
    }
    if (file.size > MAX_NOTICE_ATTACHMENT_BYTES) {
      setAttachmentError('File must be 2MB or smaller.');
      return;
    }
    setAttachment(file);
  };

  // Changing class clears a previously-picked section from the old class.
  const handleClassChange = (value, onChange) => {
    onChange(value);
    setValue('sectionName', '');
  };

  const handleClose = () => {
    setFormError('');
    onClose();
  };

  const onSubmit = async (data) => {
    setFormError('');
    try {
      let attachmentFields = { attachmentUrl: '', attachmentName: '', attachmentSize: null };
      if (attachment instanceof File) {
        setIsUploading(true);
        attachmentFields = await uploadNoticeAttachment(attachment);
      } else if (attachment?.url) {
        attachmentFields = { attachmentUrl: attachment.url, attachmentName: attachment.name, attachmentSize: attachment.size };
      }
      const payload = { ...data, ...attachmentFields };

      if (isEdit) {
        await updateNotice(notice.id, payload);
      } else {
        await createNotice(payload);
      }
      onSuccess?.(isEdit ? 'Notice updated successfully.' : 'Notice posted successfully.');
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Edit Notice' : 'Post Notice'}
      description={isEdit ? 'Update this notice’s details.' : 'Share an announcement with the school or a specific class.'}
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
            form="notice-form"
            label={isUploading ? 'Uploading...' : isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Post Notice'}
            disabled={isSubmitting || isUploading}
          />
        </div>
      }
    >
      <form id="notice-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 py-1">
        {formError && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{formError}</p>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title <span className="text-red-500">*</span>
          </label>
          <Input placeholder="e.g. Parent-Teacher Meeting" error={errors.title?.message} {...register('title')} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message <span className="text-red-500">*</span>
          </label>
          <textarea
            {...register('message')}
            rows={3}
            placeholder="Write the announcement details..."
            className="w-full py-2.5 px-4 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          {errors.message && <p className="text-xs text-red-500 mt-1">{errors.message.message}</p>}
        </div>

        <div className={isTeacher ? '' : 'grid grid-cols-2 gap-4'}>
          {!isTeacher && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Audience</label>
              <Controller
                name="audience"
                control={control}
                render={({ field }) => (
                  <Dropdown
                    icon={<FiUsers className="w-4 h-4" />}
                    options={NOTICE_AUDIENCES.map((a) => ({ value: a, label: a }))}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
            <Controller
              name="priority"
              control={control}
              render={({ field }) => (
                <Dropdown
                  icon={<FiFlag className="w-4 h-4" />}
                  options={NOTICE_PRIORITIES.map((p) => ({ value: p, label: p }))}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
        </div>

        {audience === 'Class' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Academic Session</label>
              <Controller
                name="academicSession"
                control={control}
                render={({ field }) => (
                  <Dropdown
                    icon={<FiCalendar className="w-4 h-4" />}
                    options={sessionOptions}
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.academicSession?.message}
                  />
                )}
              />
            </div>

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
                  Section {isTeacher && <span className="text-red-500">*</span>}
                </label>
                <Controller
                  name="sectionName"
                  control={control}
                  render={({ field }) => (
                    <Dropdown
                      placeholder={selectedClass ? 'Select section' : 'Select a class first'}
                      icon={<FiGrid className="w-4 h-4" />}
                      options={sectionOptions}
                      value={field.value}
                      onChange={field.onChange}
                      disabled={!selectedClass}
                      error={errors.sectionName?.message}
                    />
                  )}
                />
              </div>
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date (optional)</label>
            <Controller
              name="expiryDate"
              control={control}
              render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} />}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Attachment (optional)</label>
            <CompactAttachmentField value={attachment} onSelect={handleAttachmentSelect} error={attachmentError} />
          </div>
        </div>
      </form>
    </Modal>
  );
}
