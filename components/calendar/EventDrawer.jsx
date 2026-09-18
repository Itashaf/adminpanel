'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FiCalendar as FiCalendarIcon, FiTag, FiUsers, FiLayers, FiGrid, FiCheck, FiPlus, FiX } from 'react-icons/fi';
import SlideOver from '@/components/SlideOver';
import Input from '@/components/Input';
import Dropdown from '@/components/Dropdown';
import DatePicker from '@/components/DatePicker';
import Button from '@/components/Button';
import Toggle from '@/components/Toggle';
import { calendarEventSchema } from '@/lib/schemas';
import {
  CALENDAR_CATEGORIES,
  CALENDAR_COLORS,
  CALENDAR_APPLIES_TO_TYPES,
  CATEGORY_COLOR_MAP,
  COLOR_STYLES,
} from '@/lib/calendarEventConstants';
import { useClassSections, getSectionOptions } from '@/lib/hooks/useClassSections';
import { createCalendarEvent, updateCalendarEvent } from '@/lib/api';

const EMPTY_VALUES = {
  title: '',
  category: 'Exam',
  color: CATEGORY_COLOR_MAP.Exam,
  startDate: '',
  endDate: '',
  appliesToType: 'Whole School',
  appliesToClasses: [],
  appliesToSections: [],
  description: '',
  isVisible: true,
  academicSession: '',
};

function ColorSelector({ value, onChange }) {
  return (
    <div className="flex items-center flex-wrap gap-3">
      {CALENDAR_COLORS.map((color) => {
        const isSelected = value === color;
        return (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            title={color}
            className={`relative flex items-center justify-center w-9 h-9 rounded-full ${COLOR_STYLES[color].bg} cursor-pointer transition ${
              isSelected ? `ring-2 ring-offset-2 ${COLOR_STYLES[color].ring}` : 'hover:opacity-80'
            }`}
          >
            {isSelected && <FiCheck className="w-4 h-4 text-white" />}
          </button>
        );
      })}
    </div>
  );
}

// 'Specific Class' targets one or more whole classes at once — a toggleable
// chip list rather than a single-select Dropdown, since the whole point is
// picking more than one.
function ClassMultiSelect({ options, value, onChange, error }) {
  const toggle = (className) => {
    onChange(value.includes(className) ? value.filter((c) => c !== className) : [...value, className]);
  };

  if (options.length === 0) {
    return <p className="text-sm text-gray-400">No classes set up yet.</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = value.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => toggle(option.value)}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition cursor-pointer ${
                isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {isSelected && <FiCheck className="w-3 h-3" />}
              {option.label}
            </button>
          );
        })}
      </div>
      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </div>
  );
}

// 'Specific Section' targets one or more individual class+section
// combinations — each row picks its own class/section pair independently
// (a school's sections differ per class), with rows added/removed freely.
function SectionRowsField({ classOptions, classSections, value, onChange, error }) {
  const rows = value.length ? value : [{ class: '', section: '' }];

  const updateRow = (index, patch) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };
  const addRow = () => onChange([...rows, { class: '', section: '' }]);
  const removeRow = (index) => onChange(rows.filter((_, i) => i !== index));

  return (
    <div>
      <div className="space-y-3">
        {rows.map((row, index) => {
          const sectionOptions = row.class ? getSectionOptions(classSections, row.class) : [];
          return (
            <div key={index} className="flex items-start gap-2">
              <div className="flex-1">
                <Dropdown
                  placeholder="Select class"
                  icon={<FiLayers className="w-4 h-4" />}
                  options={classOptions}
                  value={row.class}
                  onChange={(v) => updateRow(index, { class: v, section: '' })}
                  searchable
                />
              </div>
              <div className="flex-1">
                <Dropdown
                  placeholder={row.class ? 'Select section' : 'Select a class first'}
                  icon={<FiGrid className="w-4 h-4" />}
                  options={sectionOptions}
                  value={row.section}
                  onChange={(v) => updateRow(index, { section: v })}
                  disabled={!row.class}
                />
              </div>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  className="flex items-center justify-center w-11 h-11 text-gray-300 hover:text-red-500 cursor-pointer shrink-0"
                >
                  <FiX className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={addRow}
        className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer"
      >
        <FiPlus className="w-3.5 h-3.5" />
        Add Class &amp; Section
      </button>
      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </div>
  );
}

export default function EventDrawer({ isOpen, onClose, event, defaultSession, sessionOptions, onSuccess }) {
  const isEdit = Boolean(event);
  const classSections = useClassSections();

  const {
    handleSubmit,
    control,
    register,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(calendarEventSchema), defaultValues: EMPTY_VALUES });

  const appliesToType = watch('appliesToType');

  const classOptions = Object.keys(classSections).map((c) => ({ value: c, label: c }));

  useEffect(() => {
    if (!isOpen) return;
    reset(
      isEdit
        ? {
            title: event.title,
            category: event.category,
            color: event.color,
            startDate: event.startDate,
            endDate: event.endDate || event.startDate,
            appliesToType: event.appliesToType,
            appliesToClasses: event.appliesToClasses || [],
            appliesToSections: event.appliesToSections || [],
            description: event.description || '',
            isVisible: event.isVisible,
            academicSession: event.academicSession || defaultSession || '',
          }
        : { ...EMPTY_VALUES, academicSession: defaultSession || '' }
    );
  }, [isOpen, isEdit, event, defaultSession, reset]);

  // Picking a category re-suggests that category's default color, but only
  // while adding — editing an event that was manually recolored away from
  // its category default shouldn't get silently reset just from touching
  // other fields (this effect only fires when `category` itself changes).
  const handleCategoryChange = (value, onChange) => {
    onChange(value);
    setValue('color', CATEGORY_COLOR_MAP[value] || 'Purple');
  };

  const handleAppliesToChange = (value, onChange) => {
    onChange(value);
    setValue('appliesToClasses', []);
    setValue('appliesToSections', []);
  };

  const onSubmit = async (data) => {
    if (isEdit) {
      await updateCalendarEvent(event.id, data);
      onSuccess?.('Event updated successfully.');
    } else {
      await createCalendarEvent(data);
      onSuccess?.('Event added successfully.');
    }
  };

  return (
    <SlideOver
      title={isEdit ? 'Edit Event' : 'Add Event'}
      description={isEdit ? "Update this event's details." : 'Add a new item to the academic calendar.'}
      icon={<FiCalendarIcon className="w-5 h-5" />}
      isOpen={isOpen}
      onClose={onClose}
      footer={
        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <div className="w-full sm:w-auto">
            <Button label="Cancel" type="button" variant="secondary" onClick={onClose} fullWidth />
          </div>
          <div className="w-full sm:w-auto">
            <Button
              type="submit"
              form="event-drawer-form"
              label={isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Event'}
              disabled={isSubmitting}
              fullWidth
            />
          </div>
        </div>
      }
    >
      <form id="event-drawer-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Event Name <span className="text-red-500">*</span>
          </label>
          <Input placeholder="e.g. FA-2 Examination" error={errors.title?.message} {...register('title')} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <Dropdown
                icon={<FiTag className="w-4 h-4" />}
                options={CALENDAR_CATEGORIES.map((c) => ({ value: c, label: c }))}
                value={field.value}
                onChange={(value) => handleCategoryChange(value, field.onChange)}
              />
            )}
          />
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
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <Controller
              name="endDate"
              control={control}
              render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} error={errors.endDate?.message} />}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Academic Session</label>
          <Controller
            name="academicSession"
            control={control}
            render={({ field }) => (
              <Dropdown icon={<FiCalendarIcon className="w-4 h-4" />} options={sessionOptions} value={field.value} onChange={field.onChange} />
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Applies To</label>
          <Controller
            name="appliesToType"
            control={control}
            render={({ field }) => (
              <Dropdown
                icon={<FiUsers className="w-4 h-4" />}
                options={CALENDAR_APPLIES_TO_TYPES.map((t) => ({ value: t, label: t }))}
                value={field.value}
                onChange={(value) => handleAppliesToChange(value, field.onChange)}
              />
            )}
          />
        </div>

        {appliesToType === 'Specific Class' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Classes <span className="text-red-500">*</span>
            </label>
            <Controller
              name="appliesToClasses"
              control={control}
              render={({ field }) => (
                <ClassMultiSelect options={classOptions} value={field.value} onChange={field.onChange} error={errors.appliesToClasses?.message} />
              )}
            />
          </div>
        )}

        {appliesToType === 'Specific Section' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Classes &amp; Sections <span className="text-red-500">*</span>
            </label>
            <Controller
              name="appliesToSections"
              control={control}
              render={({ field }) => (
                <SectionRowsField
                  classOptions={classOptions}
                  classSections={classSections}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.appliesToSections?.message}
                />
              )}
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            {...register('description')}
            rows={3}
            placeholder="Add any additional details..."
            className="w-full py-2.5 px-4 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
          <Controller name="color" control={control} render={({ field }) => <ColorSelector value={field.value} onChange={field.onChange} />} />
        </div>

        <div className="pt-1 pb-2">
          <Controller
            name="isVisible"
            control={control}
            render={({ field }) => (
              <Toggle
                checked={field.value}
                onChange={field.onChange}
                label="Event Visibility"
                description="Show this event on the calendar and to parents/teachers."
              />
            )}
          />
        </div>
      </form>
    </SlideOver>
  );
}
