'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FiArrowLeft, FiLayers, FiGrid, FiBook, FiCheck, FiX, FiUnlock, FiMoreVertical } from 'react-icons/fi';
import Dropdown from '@/components/Dropdown';
import Badge from '@/components/Badge';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import DropdownMenu from '@/components/DropdownMenu';
import Toast from '@/components/Toast';
import { getMarksForVerification, verifyExamMarks } from '@/lib/api';

const STATUS_VARIANTS = { Draft: 'gray', Submitted: 'blue', UnderReview: 'amber', Approved: 'green', Published: 'purple' };

const ATTENDANCE_LABEL = { Absent: 'Absent', Medical: 'Medical', Exempted: 'Exempted', ReExam: 'Re-Exam' };
const ATTENDANCE_CLASS = {
  Absent: 'text-red-600',
  Medical: 'text-amber-600',
  Exempted: 'text-sky-600',
  ReExam: 'text-purple-600',
};

// What to show in the marks column depends entirely on the schedule's own
// markingType/hasPractical — a Grade/Remarks subject never had a numeric
// marksObtained to begin with, and a practical component is a second number
// alongside the theory one, not instead of it.
function MarkValue({ mark, schedule }) {
  if (mark.attendanceStatus && mark.attendanceStatus !== 'Present') {
    return <span className={`text-xs font-semibold ${ATTENDANCE_CLASS[mark.attendanceStatus]}`}>{ATTENDANCE_LABEL[mark.attendanceStatus]}</span>;
  }
  if (schedule.markingType === 'Grade') {
    return <span>{mark.gradeValue || '—'}</span>;
  }
  if (schedule.markingType === 'Remarks') {
    return <span className="truncate max-w-[120px] inline-block align-bottom">{mark.remarksValue || '—'}</span>;
  }
  return (
    <span>
      {mark.marksObtained !== null ? `${mark.marksObtained} / ${schedule.maxMarks}` : '—'}
      {schedule.hasPractical && (
        <span className="block text-[11px] text-gray-400 font-normal">
          Pr. {mark.practicalMarksObtained !== null ? `${mark.practicalMarksObtained} / ${schedule.practicalMaxMarks}` : '—'}
        </span>
      )}
    </span>
  );
}

export default function ExamVerificationClient({ exam }) {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  // null = the bulk "Reject" button (every awaiting-review row); a studentId
  // = the per-row "..." menu's Reject, scoped to just that one student.
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const sectionOptions = useMemo(() => {
    if (!selectedClass) return [];
    const sections = [...new Set(exam.schedules.filter((s) => s.className === selectedClass).map((s) => s.sectionName))];
    return sections.map((s) => ({ value: s, label: s ? `Section ${s}` : 'Whole Class (all sections)' }));
  }, [exam.schedules, selectedClass]);

  const subjectOptions = useMemo(() => {
    if (!selectedClass) return [];
    const subjects = [
      ...new Set(
        exam.schedules.filter((s) => s.className === selectedClass && s.sectionName === selectedSection).map((s) => s.subject)
      ),
    ];
    return subjects.map((s) => ({ value: s, label: s }));
  }, [exam.schedules, selectedClass, selectedSection]);

  const loadMarks = async () => {
    if (!selectedClass || !selectedSubject) {
      setData(null);
      return;
    }
    setIsLoading(true);
    try {
      const result = await getMarksForVerification(exam.id, { className: selectedClass, sectionName: selectedSection, subject: selectedSubject });
      setData(result);
    } catch {
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMarks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass, selectedSection, selectedSubject]);

  const counts = useMemo(() => {
    const marks = data?.marks || [];
    return {
      total: marks.length,
      submitted: marks.filter((m) => m.status === 'Submitted' || m.status === 'UnderReview').length,
      // Distinct from `submitted` above — only a plain Submitted (never yet
      // reviewed) is locked and needs Unlock; UnderReview is already
      // editable by the Teacher (that's the whole point of a rejection).
      submittedLocked: marks.filter((m) => m.status === 'Submitted').length,
      approved: marks.filter((m) => m.status === 'Approved' || m.status === 'Published').length,
      draft: marks.filter((m) => m.status === 'Draft').length,
    };
  }, [data]);

  const handleApprove = async (studentId = null) => {
    setIsWorking(true);
    try {
      const result = await verifyExamMarks(data.schedule.id, 'approve', '', studentId);
      setData(result);
      setToastMessage(studentId ? 'Student’s marks approved and locked.' : 'Marks approved and locked.');
    } finally {
      setIsWorking(false);
    }
  };

  const openRejectModal = (studentId = null) => {
    setRejectTarget(studentId);
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setRejectError('A reason is required.');
      return;
    }
    setIsWorking(true);
    try {
      const result = await verifyExamMarks(data.schedule.id, 'reject', rejectReason.trim(), rejectTarget);
      setData(result);
      setShowRejectModal(false);
      setRejectReason('');
      setRejectError('');
      setRejectTarget(null);
      setToastMessage(rejectTarget ? 'Student’s marks sent back for correction.' : 'Marks sent back to the teacher for correction.');
    } catch (err) {
      setRejectError(err.message);
    } finally {
      setIsWorking(false);
    }
  };

  const handleUnlock = async (studentId = null) => {
    setIsWorking(true);
    try {
      const result = await verifyExamMarks(data.schedule.id, 'unlock', '', studentId);
      setData(result);
      setToastMessage(studentId ? 'Student’s marks unlocked — they can re-enter them.' : 'Marks unlocked — the teacher can re-enter them.');
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link href={`/dashboard/exams/${exam.id}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <FiArrowLeft className="w-4 h-4" />
        Back to {exam.name}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Marks Verification</h1>
        <p className="text-sm text-gray-500 mt-1">{exam.name} — review, approve, or reject entered marks.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Class</label>
          <Dropdown
            placeholder="Select class"
            icon={<FiLayers className="w-4 h-4" />}
            options={exam.classes.map((c) => ({ value: c, label: c }))}
            value={selectedClass}
            onChange={(v) => {
              setSelectedClass(v);
              setSelectedSection('');
              setSelectedSubject('');
            }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Section</label>
          <Dropdown
            placeholder={selectedClass ? 'Whole Class (all sections)' : 'Select a class first'}
            icon={<FiGrid className="w-4 h-4" />}
            options={sectionOptions}
            value={selectedSection}
            onChange={(v) => {
              setSelectedSection(v);
              setSelectedSubject('');
            }}
            disabled={!selectedClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Subject</label>
          <Dropdown
            placeholder={selectedClass ? 'Select subject' : 'Select a class first'}
            icon={<FiBook className="w-4 h-4" />}
            options={subjectOptions}
            value={selectedSubject}
            onChange={setSelectedSubject}
            disabled={!selectedClass}
          />
        </div>
      </div>

      {isLoading && <p className="text-sm text-gray-500 text-center py-6">Loading marks...</p>}

      {!isLoading && data && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-gray-100">
            <p className="text-sm text-gray-500">
              {counts.approved} approved • {counts.submitted} awaiting review
              {counts.draft > 0 ? ` • ${counts.draft} not yet submitted` : ''}
              {data.schedule.markingType === 'Numeric' && ` • Max ${data.schedule.maxMarks}, Pass ${data.schedule.passingMarks}`}
              {data.schedule.hasPractical && ` (+ Practical: Max ${data.schedule.practicalMaxMarks}, Pass ${data.schedule.practicalPassingMarks})`}
              {data.schedule.markingType !== 'Numeric' && ` • ${data.schedule.markingType}-marked subject`}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              {(counts.approved > 0 || counts.submittedLocked > 0) && (
                <Button label="Unlock" icon={<FiUnlock className="w-4 h-4" />} variant="secondary" size="sm" onClick={() => handleUnlock()} disabled={isWorking} />
              )}
              {counts.submitted > 0 && (
                <>
                  <Button label="Reject" icon={<FiX className="w-4 h-4" />} variant="secondary" size="sm" onClick={() => openRejectModal()} disabled={isWorking} />
                  <Button label="Approve" icon={<FiCheck className="w-4 h-4" />} size="sm" onClick={() => handleApprove()} disabled={isWorking} />
                </>
              )}
            </div>
          </div>

          {data.marks.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-10">No students found for this class and section.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {data.marks.map((mark, index) => (
                <div key={mark.id || mark.studentId} className="flex items-center gap-3 px-5 py-3">
                  <span className="text-xs font-medium text-gray-400 w-6 shrink-0 text-center">{index + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{mark.studentName}</p>
                    <p className="text-xs text-gray-400">{mark.admissionId}</p>
                    {mark.status === 'UnderReview' && mark.rejectionReason && (
                      <p className="text-xs text-red-500 mt-0.5">Rejected: {mark.rejectionReason}</p>
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-700 shrink-0 w-20 text-center">
                    <MarkValue mark={mark} schedule={data.schedule} />
                  </span>
                  <span className="shrink-0">
                    <Badge label={mark.status} variant={STATUS_VARIANTS[mark.status]} />
                  </span>
                  <span className="shrink-0 w-7">
                    {(mark.status === 'Submitted' || mark.status === 'UnderReview' || mark.status === 'Approved') && (
                      <DropdownMenu
                        trigger={<FiMoreVertical className="w-4 h-4" />}
                        items={
                          mark.status === 'Approved'
                            ? [{ label: 'Unlock', icon: <FiUnlock className="w-4 h-4" />, onClick: () => handleUnlock(mark.studentId) }]
                            : [
                                { label: 'Approve', icon: <FiCheck className="w-4 h-4" />, onClick: () => handleApprove(mark.studentId) },
                                { label: 'Reject', icon: <FiX className="w-4 h-4" />, onClick: () => openRejectModal(mark.studentId), danger: true },
                              ]
                        }
                      />
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!isLoading && !data && selectedClass && selectedSubject && (
        <p className="text-sm text-gray-500 text-center py-10">No marks entered yet for this selection.</p>
      )}

      <Modal
        title="Reject marks"
        description={
          rejectTarget
            ? 'Send this student’s marks back to the teacher for correction.'
            : 'Send every awaiting-review mark back to the teacher for correction.'
        }
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setRejectReason('');
          setRejectError('');
          setRejectTarget(null);
        }}
      >
        <div className="space-y-4">
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            placeholder="Reason for rejection..."
            className="w-full py-2.5 px-4 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          {rejectError && <p className="text-xs text-red-500">{rejectError}</p>}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
            <Button
              label="Cancel"
              type="button"
              variant="secondary"
              onClick={() => {
                setShowRejectModal(false);
                setRejectReason('');
                setRejectError('');
                setRejectTarget(null);
              }}
            />
            <Button label={isWorking ? 'Sending...' : 'Reject Marks'} onClick={handleReject} disabled={isWorking} />
          </div>
        </div>
      </Modal>

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}
