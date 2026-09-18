'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FiPlus, FiEdit2, FiTrash2, FiChevronDown, FiChevronUp, FiClock, FiLayers, FiCalendar, FiBarChart2 } from 'react-icons/fi';
import { FaRupeeSign } from 'react-icons/fa';
import Modal from '@/components/Modal';
import Input from '@/components/Input';
import Button from '@/components/Button';
import Dropdown from '@/components/Dropdown';
import Toggle from '@/components/Toggle';
import { feeStructureSchema, feeStructureBaseSchema } from '@/lib/schemas';
import { FEE_TERMS, TERM_LABELS, TERM_DISPLAY_NAMES } from '@/lib/feeConstants';
import { createFeeStructure, createFeeStructuresBulk, updateFeeStructure } from '@/lib/api';

const EMPTY_TERMS = { T1: [], T2: [], T3: [], T4: [] };
const REQUIRED_OPTIONS = [
  { value: 'required', label: 'Required' },
  { value: 'optional', label: 'Optional' },
];
const APPLY_TO_OPTIONS = [
  { value: 'THIS_TERM', label: 'This term only' },
  { value: 'ALL_QUARTERS', label: 'All quarters' },
];
const LATE_FEE_TYPE_OPTIONS = [
  { value: 'FIXED', label: 'Fixed' },
  { value: 'PER_DAY', label: 'Per Day' },
];

function formatCurrency(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function emptyLateFeeDraft() {
  return { enabled: false, graceDays: '7', type: 'FIXED', amount: '', maxAmount: '' };
}

// Inline "+ Add Fee" panel for one term — kept in this file rather than
// split out since "Apply to: All Quarters" needs to reach every term's
// array at once (see FeeStructureFormModal's handleAddFeeSave), not just
// the term this panel was opened from. Doubles as the edit panel for an
// existing item when `initialItem` is given (see TermSection's per-row edit
// pencil) — same fields, minus "Apply to" (editing changes just this one
// item in place, it doesn't also copy the edit into other quarters).
function AddFeeItemForm({ onCancel, onSave, initialItem }) {
  const isEditMode = Boolean(initialItem);
  const [name, setName] = useState(initialItem?.name || '');
  const [amount, setAmount] = useState(initialItem ? String(initialItem.amount) : '');
  const [required, setRequired] = useState(initialItem ? initialItem.required !== false : true);
  const [applyTo, setApplyTo] = useState('THIS_TERM');
  const [lateFee, setLateFee] = useState(() =>
    initialItem?.lateFee?.enabled
      ? {
          enabled: true,
          graceDays: String(initialItem.lateFee.graceDays ?? 7),
          type: initialItem.lateFee.type || 'FIXED',
          amount: String(initialItem.lateFee.amount ?? ''),
          maxAmount: initialItem.lateFee.maxAmount != null ? String(initialItem.lateFee.maxAmount) : '',
        }
      : emptyLateFeeDraft()
  );
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!name.trim()) return setError('Fee name is required.');
    if (!(Number(amount) > 0)) return setError('Enter a valid positive amount.');
    if (lateFee.enabled && !(Number(lateFee.amount) > 0)) return setError('Enter a valid late fee amount.');

    const item = {
      name: name.trim(),
      amount: Number(amount),
      required,
      lateFee: lateFee.enabled
        ? {
            enabled: true,
            graceDays: Number(lateFee.graceDays) || 0,
            type: lateFee.type,
            amount: Number(lateFee.amount),
            maxAmount: lateFee.maxAmount ? Number(lateFee.maxAmount) : null,
          }
        : { enabled: false },
    };

    if (isEditMode) {
      onSave({ ...item, id: initialItem.id });
    } else {
      onSave(item, applyTo);
    }
  };

  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-3 mt-2">
      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input placeholder="Fee name (e.g. Tuition Fee)" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>

      <div className={`grid grid-cols-1 gap-3 ${isEditMode ? '' : 'sm:grid-cols-2'}`}>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Required / Optional</label>
          <Dropdown
            options={REQUIRED_OPTIONS}
            value={required ? 'required' : 'optional'}
            onChange={(v) => setRequired(v === 'required')}
          />
        </div>
        {!isEditMode && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Apply to</label>
            <Dropdown options={APPLY_TO_OPTIONS} value={applyTo} onChange={setApplyTo} />
          </div>
        )}
      </div>

      <div className="border-t border-indigo-100 pt-3">
        <Toggle
          checked={lateFee.enabled}
          onChange={(enabled) => setLateFee((prev) => ({ ...prev, enabled }))}
          label="Late Fee"
          description="Charge extra if paid after the due date."
        />

        {lateFee.enabled && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Grace (days)</label>
              <Input
                inputMode="numeric"
                value={lateFee.graceDays}
                onChange={(e) => setLateFee((p) => ({ ...p, graceDays: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Type</label>
              <Dropdown
                options={LATE_FEE_TYPE_OPTIONS}
                value={lateFee.type}
                onChange={(v) => setLateFee((p) => ({ ...p, type: v }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Amount</label>
              <Input
                inputMode="numeric"
                value={lateFee.amount}
                onChange={(e) => setLateFee((p) => ({ ...p, amount: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Maximum</label>
              <Input
                inputMode="numeric"
                value={lateFee.maxAmount}
                onChange={(e) => setLateFee((p) => ({ ...p, maxAmount: e.target.value }))}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button label="Cancel" type="button" variant="secondary" onClick={onCancel} fullWidth={false} />
        <Button label={isEditMode ? 'Save Changes' : 'Save Fee'} type="button" onClick={handleSave} fullWidth={false} />
      </div>
    </div>
  );
}

// One collapsible Q1-Q4 section — header shows the term's own running total,
// expanded content lists its items (with a Required/Optional tag and a
// clock icon when a late fee is configured) plus the "+ Add Fee" trigger.
function TermSection({
  term,
  items,
  isExpanded,
  onToggle,
  onAddFee,
  addFeeOpen,
  onCancelAddFee,
  onSaveAddFee,
  onRemoveItem,
  editingItemId,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
}) {
  const total = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <div className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition">
        <button type="button" onClick={onToggle} className="flex items-center gap-2 flex-1 min-w-0 text-left cursor-pointer">
          {isExpanded ? (
            <FiChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
          ) : (
            <FiChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
          )}
          <span className="font-semibold text-gray-900 text-sm">{TERM_DISPLAY_NAMES[term]}</span>
          <span className="text-xs text-gray-400 hidden sm:inline">{TERM_LABELS[term]}</span>
        </button>
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-bold text-gray-900 text-sm">{formatCurrency(total)}</span>
          <button
            type="button"
            onClick={onAddFee}
            title="Add a fee to this term"
            className="text-gray-400 hover:text-indigo-600 cursor-pointer"
          >
            <FiEdit2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-2">
          {items.length === 0 && <p className="text-xs text-gray-400">No fee items yet.</p>}
          {items.map((item) =>
            editingItemId === item.id ? (
              <AddFeeItemForm key={item.id} initialItem={item} onCancel={onCancelEdit} onSave={onSaveEdit} />
            ) : (
              <div key={item.id} className="flex items-center justify-between text-sm py-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-gray-700 truncate">{item.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                      item.required ? 'bg-gray-100 text-gray-500' : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    {item.required ? 'Required' : 'Optional'}
                  </span>
                  {item.lateFee?.enabled && <FiClock className="w-3 h-3 text-gray-400 shrink-0" />}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-gray-900 font-medium">{formatCurrency(item.amount)}</span>
                  <button
                    type="button"
                    onClick={() => onStartEdit(item)}
                    className="text-gray-300 hover:text-indigo-600 cursor-pointer"
                  >
                    <FiEdit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.id)}
                    className="text-gray-300 hover:text-red-600 cursor-pointer"
                  >
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          )}

          {addFeeOpen ? (
            <AddFeeItemForm onCancel={onCancelAddFee} onSave={onSaveAddFee} />
          ) : (
            !editingItemId && (
              <button
                type="button"
                onClick={onAddFee}
                className="flex items-center gap-1.5 text-sm font-medium text-indigo-700 hover:text-indigo-800 cursor-pointer pt-1"
              >
                <FiPlus className="w-3.5 h-3.5" />
                Add Fee
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

// Deep-copies a saved structure's terms into fresh, independently-editable
// local rows (new `local-` ids) — used both for edit (copy of the structure
// being edited) and duplicate (copy of some *other* structure, as a starting
// point for a new one).
function cloneTerms(terms) {
  return FEE_TERMS.reduce((acc, term) => {
    acc[term] = (terms[term] || []).map((item) => ({
      ...item,
      id: `local-${Date.now()}-${term}-${Math.random().toString(36).slice(2, 6)}`,
    }));
    return acc;
  }, {});
}

// Checkbox grid, not the single-select Dropdown used everywhere else — a
// fee schedule is very often identical across several classes, and this is
// the one piece of UI that turns "re-enter the same fee heads N times" into
// "check N boxes once" (see the admin's own ask: this needed to be easy).
function ClassPicker({ classOptions, selected, onChange, error }) {
  const allSelected = classOptions.length > 0 && selected.length === classOptions.length;

  const toggleClass = (value) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  };

  const toggleAll = () => {
    onChange(allSelected ? [] : classOptions.map((o) => o.value));
  };

  return (
    <div className={`rounded-2xl border p-5 ${error ? 'border-red-300' : 'border-gray-100'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 shrink-0">
            <FiLayers className="w-4 h-4" />
          </span>
          <h3 className="text-sm font-semibold text-gray-900">
            Select Class(es) <span className="text-red-500">*</span>
          </h3>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
          Select all
        </label>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {classOptions.map((option) => (
          <label
            key={option.value}
            className={`flex items-center gap-2 text-sm px-3 py-2.5 rounded-xl border cursor-pointer transition ${
              selected.includes(option.value)
                ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 text-gray-700 hover:border-gray-300'
            }`}
          >
            <input
              type="checkbox"
              checked={selected.includes(option.value)}
              onChange={() => toggleClass(option.value)}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
            />
            <span className="truncate">{option.label}</span>
          </label>
        ))}
      </div>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      {selected.length > 1 && (
        <p className="text-xs text-gray-400 mt-2">
          The same fee schedule will be created for all {selected.length} selected classes.
        </p>
      )}
    </div>
  );
}

export default function FeeStructureFormModal({
  isOpen,
  onClose,
  structure,
  duplicateFrom,
  sessionOptions,
  classOptions,
  defaultSession = '',
  onSuccess,
}) {
  const isEdit = Boolean(structure);
  const [formError, setFormError] = useState('');
  const [termsState, setTermsState] = useState(EMPTY_TERMS);
  const [expandedTerms, setExpandedTerms] = useState({ T1: true, T2: false, T3: false, T4: false });
  const [addFeeTerm, setAddFeeTerm] = useState(null);
  const [editingItem, setEditingItem] = useState(null); // { term, itemId }
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [classError, setClassError] = useState('');

  const resolver = useMemo(() => zodResolver(isEdit ? feeStructureSchema : feeStructureBaseSchema), [isEdit]);

  const {
    handleSubmit,
    control,
    register,
    reset,
    formState: { errors },
  } = useForm({
    resolver,
    defaultValues: { academicSession: '', className: '', name: '' },
  });

  useEffect(() => {
    if (!isOpen) return;
    reset(
      isEdit
        ? { academicSession: structure.academicSession, className: structure.className, name: structure.name }
        : {
            academicSession: duplicateFrom?.academicSession || defaultSession || sessionOptions[0]?.value || '',
            className: '',
            name: '',
          }
    );
    setTermsState(isEdit ? cloneTerms(structure.terms) : duplicateFrom ? cloneTerms(duplicateFrom.terms) : EMPTY_TERMS);
    setSelectedClasses(isEdit ? [structure.className] : []);
    setClassError('');
    setExpandedTerms({ T1: true, T2: false, T3: false, T4: false });
    setAddFeeTerm(null);
    setEditingItem(null);
    setFormError('');
  }, [isOpen, isEdit, structure, duplicateFrom, sessionOptions, defaultSession, reset]);

  const handleClose = () => {
    setFormError('');
    onClose();
  };

  const toggleTerm = (term) => {
    setExpandedTerms((prev) => ({ ...prev, [term]: !prev[term] }));
  };

  // "All quarters" copies the same item into every term's own array (each a
  // fully independent, separately editable/removable row afterward) rather
  // than persisting some ongoing link between them — matches how the terms
  // themselves are already independent lists.
  const handleAddFeeSave = (item, applyTo) => {
    setTermsState((prev) => {
      const next = { ...prev };
      const targets = applyTo === 'ALL_QUARTERS' ? FEE_TERMS : [addFeeTerm];
      for (const term of targets) {
        next[term] = [...next[term], { ...item, id: `local-${Date.now()}-${term}-${Math.random().toString(36).slice(2, 6)}` }];
      }
      return next;
    });
    setAddFeeTerm(null);
  };

  const handleRemoveItem = (term, itemId) => {
    setTermsState((prev) => ({ ...prev, [term]: prev[term].filter((i) => i.id !== itemId) }));
    if (editingItem?.term === term && editingItem.itemId === itemId) setEditingItem(null);
  };

  const handleStartEdit = (term, item) => {
    setAddFeeTerm(null);
    setEditingItem({ term, itemId: item.id });
  };

  const handleCancelEdit = () => setEditingItem(null);

  const handleSaveEdit = (term, updatedItem) => {
    setTermsState((prev) => ({
      ...prev,
      [term]: prev[term].map((i) => (i.id === updatedItem.id ? updatedItem : i)),
    }));
    setEditingItem(null);
  };

  const onSubmit = async (data) => {
    setFormError('');
    setClassError('');
    const hasAnyItem = FEE_TERMS.some((term) => termsState[term].length > 0);
    if (!hasAnyItem) {
      setFormError('Add at least one fee item to at least one term.');
      return;
    }

    if (isEdit) {
      setIsSubmitting(true);
      try {
        const updated = await updateFeeStructure(structure.id, { ...data, terms: termsState });
        onSuccess?.([updated], 'Fee structure updated.');
      } catch (err) {
        setFormError(err.message);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (selectedClasses.length === 0) {
      setClassError('Select at least one class.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedClasses.length === 1) {
        const created = await createFeeStructure({ ...data, className: selectedClasses[0], terms: termsState });
        onSuccess?.([created], 'Fee structure created — first quarter’s fees generated for students.');
      } else {
        const result = await createFeeStructuresBulk({ ...data, classNames: selectedClasses, terms: termsState });
        const message =
          result.skipped.length > 0
            ? `${result.created.length} fee structure(s) created (first quarter billed), ${result.skipped.length} skipped (already exist).`
            : `${result.created.length} fee structure(s) created — first quarter’s fees generated for students.`;
        onSuccess?.(result.created, message);
      }
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const termTotal = (term) => termsState[term].reduce((sum, item) => sum + item.amount, 0);
  const annualTotal = FEE_TERMS.reduce((sum, term) => sum + termTotal(term), 0);

  return (
    <Modal
      title={isEdit ? 'Edit Fee Structure' : duplicateFrom ? 'Duplicate Fee Structure' : 'Create Fee Structure'}
      description={
        isEdit
          ? "Define the complete academic-year fee structure for a class."
          : 'Define the fee schedule once, then apply it to as many classes as you need.'
      }
      icon={<FaRupeeSign className="w-4 h-4" />}
      isOpen={isOpen}
      onClose={handleClose}
      size="xl"
      footer={
        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <div className="w-full sm:w-auto">
            <Button label="Cancel" type="button" variant="secondary" onClick={handleClose} fullWidth />
          </div>
          <Button
            type="submit"
            form="fee-structure-form"
            label={isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Structure'}
            disabled={isSubmitting}
          />
        </div>
      }
    >
      <form id="fee-structure-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5 py-1">
        {formError && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{formError}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Academic Session <span className="text-red-500">*</span>
            </label>
            <Controller
              name="academicSession"
              control={control}
              render={({ field }) => (
                <Dropdown
                  options={sessionOptions}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select session"
                  error={errors.academicSession?.message}
                  disabled={isEdit}
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
                  <Dropdown options={classOptions} value={field.value} onChange={field.onChange} placeholder="Select class" disabled />
                )}
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Structure Name (optional)</label>
              <Input {...register('name')} placeholder="e.g. Regular Fee" error={errors.name?.message} />
            </div>
          )}
        </div>

        {isEdit ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Structure Name (optional)</label>
            <Input {...register('name')} placeholder="e.g. Class 5 Regular Fee" error={errors.name?.message} />
          </div>
        ) : (
          <ClassPicker classOptions={classOptions} selected={selectedClasses} onChange={setSelectedClasses} error={classError} />
        )}

        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 shrink-0">
              <FiCalendar className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-semibold text-gray-900">Fee Schedule</h3>
          </div>
          <div className="space-y-2">
            {FEE_TERMS.map((term) => (
              <TermSection
                key={term}
                term={term}
                items={termsState[term]}
                isExpanded={expandedTerms[term]}
                onToggle={() => toggleTerm(term)}
                onAddFee={() => {
                  setExpandedTerms((prev) => ({ ...prev, [term]: true }));
                  setEditingItem(null);
                  setAddFeeTerm(term);
                }}
                addFeeOpen={addFeeTerm === term}
                onCancelAddFee={() => setAddFeeTerm(null)}
                onSaveAddFee={handleAddFeeSave}
                onRemoveItem={(itemId) => handleRemoveItem(term, itemId)}
                editingItemId={editingItem?.term === term ? editingItem.itemId : null}
                onStartEdit={(item) => handleStartEdit(term, item)}
                onCancelEdit={handleCancelEdit}
                onSaveEdit={(updatedItem) => handleSaveEdit(term, updatedItem)}
              />
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-gray-50 px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 shrink-0">
              <FiBarChart2 className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-semibold text-gray-900">Annual Summary</h3>
          </div>
          <div className="space-y-1">
            {FEE_TERMS.map((term) => (
              <div key={term} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{TERM_DISPLAY_NAMES[term]}</span>
                <span className="text-gray-900 font-medium">{formatCurrency(termTotal(term))}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-200">
            <span className="text-sm font-semibold text-gray-900">Annual Total</span>
            <span className="text-lg font-bold text-gray-900">{formatCurrency(annualTotal)}</span>
          </div>
        </div>
      </form>
    </Modal>
  );
}
