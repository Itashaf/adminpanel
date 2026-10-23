'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FiArrowRight, FiTrendingUp, FiLayers, FiUsers } from 'react-icons/fi';
import Dropdown from '@/components/Dropdown';
import Button from '@/components/Button';
import EmptyState from '@/components/EmptyState';
import PromotionPreviewDialog from './PromotionPreviewDialog';
import Toast from '@/components/Toast';
import { useClassSections, getSectionOptions } from '@/lib/hooks/useClassSections';
import { useUrlSync } from '@/lib/hooks/useUrlSync';
import { getStudentsForPromotion, promoteStudents, getPromotionConflicts } from '@/lib/api';

const ALL_SECTIONS = { value: '', label: 'All Sections' };

// `classOptions` is already in grade order (Nursery..Class 12, see
// lib/students.js's getClassOptions) — "next class" is just whichever
// option immediately follows the current one in that same list.
function nextClassValue(classOptions, currentClass) {
  const index = classOptions.findIndex((c) => c.value === currentClass);
  return index >= 0 ? classOptions[index + 1]?.value || '' : '';
}

// Promotion is just the checkbox selection itself — a selected student
// moves to the "Promote To" class/session on submit; an unselected one is
// a held-back/failed student who stays in their CURRENT class but still
// moves into the new session (lib/students.js's retainStudentsInSession) —
// otherwise they'd vanish from every roster once the old session is
// archived. No separate per-row "Promote/Retain" toggle needed; the
// checkbox already encodes it.
export default function PromoteStudentsExplorer({ classOptions, sessionOptions, defaultSession, nextSessionName }) {
  const classSections = useClassSections();
  const searchParams = useSearchParams();

  const [fromSession, setFromSession] = useState(() => searchParams.get('fromSession') || defaultSession);
  const [fromClass, setFromClass] = useState(() => searchParams.get('fromClass') || '');
  const [fromSection, setFromSection] = useState(() => searchParams.get('fromSection') || '');

  // Defaults to the NEXT academic session/class, not a same-session move —
  // that's the whole point of year-end promotion. Both stay editable
  // (an admin can still override, e.g. a mid-year section transfer).
  const [toSession, setToSession] = useState(() => searchParams.get('toSession') || nextSessionName || defaultSession);
  const [toClass, setToClass] = useState(() => searchParams.get('toClass') || '');
  const [toSection, setToSection] = useState(() => searchParams.get('toSection') || '');

  useUrlSync(
    { fromSession, fromClass, fromSection, toSession, toClass, toSection },
    {
      fromSession: defaultSession || '',
      fromClass: '',
      fromSection: '',
      toSession: nextSessionName || defaultSession || '',
      toClass: '',
      toSection: '',
    }
  );

  // Scoped to `toSession` specifically — the promote API now REJECTS a
  // target class/section that doesn't already exist for that exact session
  // (no more silent auto-create), so this must show only what's real there,
  // not the old cross-session union `classSections` above gives the From
  // side. `toClassMissing`/`toSectionMissing` catch it client-side before
  // the admin even opens the preview — server validation is still what
  // actually blocks the write.
  const toClassSections = useClassSections(toSession);
  const toClassMissing = Boolean(toClass) && !(toClass in toClassSections);
  const toSectionMissing = Boolean(toSection) && !toClassMissing && !toClassSections[toClass]?.includes(toSection);

  const [students, setStudents] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [conflicts, setConflicts] = useState([]);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);

  useEffect(() => {
    if (!fromSession || !fromClass) {
      setStudents([]);
      setSelectedIds(new Set());
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError('');
    getStudentsForPromotion({ session: fromSession, class: fromClass, section: fromSection })
      .then((rows) => {
        if (cancelled) return;
        setStudents(rows);
        // Every loaded student starts selected (the common case: everyone
        // moves up) — an admin unchecks the ones who failed.
        setSelectedIds(new Set(rows.map((s) => s.id)));
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [fromSession, fromClass, fromSection]);

  const toggleStudent = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds((prev) => (prev.size === students.length ? new Set() : new Set(students.map((s) => s.id))));
  };

  // Every loaded student moves into `toSession` either way — checked ones
  // go to toClass/toSection (promoted), unchecked ones keep their current
  // class/section (retained/held back) but still move session, or they'd
  // vanish from every roster once the old session is archived.
  const retainedIds = students.filter((s) => !selectedIds.has(s.id)).map((s) => s.id);

  // Real per-student preview rows for PromotionPreviewDialog — built from
  // state already on screen, no extra API round-trip. `conflicts` (fetched
  // right before the dialog opens — see openPreview) flags a student who
  // already has a DIFFERENT enrollment recorded for toSession; the actual
  // write (applyEnrollment in lib/students.js) rejects that exact case, so
  // surfacing it here lets the admin fix their picks instead of discovering
  // it only after clicking Confirm.
  const conflictByStudentId = new Map(conflicts.map((c) => [c.studentId, c]));
  const previewRows = students.map((s) => {
    const promoted = selectedIds.has(s.id);
    const targetClass = promoted ? toClass : s.class;
    const targetSection = promoted ? toSection : s.section;
    const existing = conflictByStudentId.get(s.id);
    const conflict =
      existing && (existing.existingClass !== targetClass || (existing.existingSection || '') !== (targetSection || ''))
        ? `Already enrolled in ${toSession} as ${existing.existingClass}${existing.existingSection ? ` - ${existing.existingSection}` : ''}`
        : null;
    return {
      id: s.id,
      name: `${s.firstName} ${s.lastName}`,
      previous: `${fromSession} · ${s.class}${s.section ? ` - ${s.section}` : ''}`,
      next: promoted
        ? `${toSession} · ${toClass}${toSection ? ` - ${toSection}` : ''}`
        : `${toSession} · ${s.class}${s.section ? ` - ${s.section}` : ''}`,
      outcome: promoted ? 'Promoted' : 'Repeat',
      conflict,
    };
  });
  const hasConflict = previewRows.some((row) => row.conflict);

  const openPreview = async () => {
    setIsCheckingConflicts(true);
    try {
      const rows = await getPromotionConflicts([...selectedIds, ...retainedIds], toSession);
      setConflicts(rows);
    } catch {
      setConflicts([]);
    } finally {
      setIsCheckingConflicts(false);
      setShowConfirm(true);
    }
  };

  const handlePromote = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      const result = await promoteStudents({
        promoteIds: [...selectedIds],
        retainIds: retainedIds,
        toSession,
        toClass,
        toSection,
      });
      setShowConfirm(false);
      const parts = [];
      if (result.promotedCount > 0) parts.push(`${result.promotedCount} promoted to ${toClass}${toSection ? ` - ${toSection}` : ''}`);
      if (result.retainedCount > 0) parts.push(`${result.retainedCount} retained in their current class`);
      if (result.unpaidFeeStudentCount > 0) parts.push(`${result.unpaidFeeStudentCount} still owe fees from the previous session`);
      setToastMessage(`${parts.join(', ')} — all now in ${toSession}.`);
      // Everyone loaded (promoted or retained) has now moved out of
      // fromSession entirely — reload so the list reflects that.
      const rows = await getStudentsForPromotion({ session: fromSession, class: fromClass, section: fromSection });
      setStudents(rows);
      setSelectedIds(new Set(rows.map((s) => s.id)));
    } catch (err) {
      setError(err.message);
      setShowConfirm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canPromote =
    students.length > 0 && Boolean(toSession) && (selectedIds.size === 0 || Boolean(toClass));

  return (
    <div className={`flex flex-col h-full ${students.length > 0 ? 'pb-10' : ''}`}>
      {error && (
        <p className="shrink-0 mb-6 text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{error}</p>
      )}

      <div className="shrink-0 mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="shrink-0">
          <h1 className="text-2xl font-bold text-gray-900">Promote Students</h1>
          <p className="text-sm text-gray-500 mt-1">
            Select students to promote | Uncheck retained.        </p>
        </div>

        <div className="shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-end gap-3">
        <div className="w-40">
          <label className="block text-xs font-medium text-gray-400 mb-1">From Session</label>
          <Dropdown options={sessionOptions} value={fromSession} onChange={setFromSession} />
        </div>
        <div className="w-40">
          <label className="block text-xs font-medium text-gray-400 mb-1">From Class</label>
          <Dropdown
            placeholder="Select class"
            options={classOptions}
            value={fromClass}
            onChange={(v) => {
              setFromClass(v);
              setFromSection('');
              setToClass(nextClassValue(classOptions, v));
              setToSection('');
            }}
          />
        </div>
        <div className="w-44">
          <label className="block text-xs font-medium text-gray-400 mb-1">From Section</label>
          <Dropdown
            options={[ALL_SECTIONS, ...getSectionOptions(classSections, fromClass)]}
            value={fromSection}
            onChange={setFromSection}
            disabled={!fromClass}
          />
        </div>
        </div>
      </div>

      <div
        className={`flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${!isLoading && fromClass && students.length > 0 ? 'shrink-0' : 'flex-1 min-h-0'
          }`}
      >
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">
            Students {students.length > 0 && `(${students.length})`}
          </h3>
          <p className="text-xs text-gray-400">
            {selectedIds.size} to promote · {retainedIds.length} to retain
          </p>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-400 text-center py-10">Loading...</p>
        ) : !fromClass ? (
          <EmptyState icon={FiLayers} description="Pick a From Session and Class to load students." />
        ) : students.length === 0 ? (
          <EmptyState icon={FiUsers} description="No active students found for this class." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="py-4 pl-6 pr-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === students.length}
                      onChange={toggleAll}
                      className="w-[18px] h-[18px] rounded-md border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-4 pr-4 w-12">S.No.</th>
                  <th className="py-4 pr-4">Student</th>
                  <th className="py-4 pr-4">Admission ID</th>
                  <th className="py-4 pr-6">Current Class</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map((s, index) => (
                  <tr key={s.id} className="hover:bg-gray-50/60 transition">
                    <td className="py-4 pl-6 pr-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(s.id)}
                        onChange={() => toggleStudent(s.id)}
                        className="w-[18px] h-[18px] rounded-md border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-4 pr-4 text-gray-600">{index + 1}</td>
                    <td className="py-4 pr-4 font-semibold text-gray-900">
                      {s.firstName} {s.lastName}
                    </td>
                    <td className="py-4 pr-4 text-gray-600">{s.admissionId}</td>
                    <td className="py-4 pr-6 text-gray-600">
                      {s.class}
                      {s.section ? ` - ${s.section}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {students.length > 0 && (
        <div className="shrink-0 mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
            <FiTrendingUp className="w-4 h-4 text-indigo-600" />
            Promote To
          </h3>
          <p className="text-xs text-gray-400 mb-4">
            Checked students move here. Unchecked students move to {toSession || 'the new session'} too, but stay in{' '}
            {fromClass || 'their current class'} (repeat the year).
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-40">
              <label className="block text-xs font-medium text-gray-400 mb-1">To Session</label>
              <Dropdown options={sessionOptions} value={toSession} onChange={setToSession} />
            </div>
            <div className="w-40">
              <label className="block text-xs font-medium text-gray-400 mb-1">To Class</label>
              <Dropdown
                placeholder="Select class"
                options={classOptions}
                value={toClass}
                onChange={(v) => {
                  setToClass(v);
                  setToSection('');
                }}
              />
            </div>
            <div className="w-44">
              <label className="block text-xs font-medium text-gray-400 mb-1">To Section</label>
              <Dropdown
                placeholder="No section"
                options={[{ value: '', label: 'No section' }, ...getSectionOptions(toClassSections, toClass)]}
                value={toSection}
                onChange={setToSection}
                disabled={!toClass}
              />
            </div>
            <Button
              label={`Process ${students.length} Student${students.length === 1 ? '' : 's'}`}
              icon={<FiArrowRight className="w-4 h-4" />}
              onClick={openPreview}
              disabled={!canPromote || isSubmitting || isCheckingConflicts || toClassMissing || toSectionMissing}
            />
          </div>
          {toClassMissing && (
            <p className="text-xs text-red-500 mt-3">
              &quot;{toClass}&quot; hasn&apos;t been created for {toSession} yet — add it under Classes &amp; Sections first.
            </p>
          )}
          {toSectionMissing && (
            <p className="text-xs text-red-500 mt-3">
              Section &quot;{toSection}&quot; doesn&apos;t exist under {toClass} for {toSession} yet — add it under Classes &amp; Sections
              first.
            </p>
          )}
        </div>
      )}

      {students.length > 0 && <div className="shrink-0 h-8" />}

      <PromotionPreviewDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handlePromote}
        rows={previewRows}
        hasConflict={hasConflict}
        isLoading={isSubmitting}
      />

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}
