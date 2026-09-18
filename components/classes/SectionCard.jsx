'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiMoreVertical, FiUserPlus, FiUserMinus, FiUserX, FiUserCheck, FiAlertTriangle, FiUsers, FiLayers, FiMapPin } from 'react-icons/fi';
import Badge from '@/components/Badge';
import DropdownMenu from '@/components/DropdownMenu';
import ConfirmDialog from '@/components/ConfirmDialog';
import Toast from '@/components/Toast';
import SectionFormModal from './SectionFormModal';
import AssignSectionTeacherModal from './AssignSectionTeacherModal';
import { updateSectionStatus, assignSectionTeacher } from '@/lib/api';

const CAPACITY_BAR_COLOR = {
  normal: 'bg-violet-700',
  reached: 'bg-amber-500',
  over: 'bg-red-500',
};

export default function SectionCard({ classId, className, academicSession, section, teacherOptions }) {
  const router = useRouter();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showUnassignConfirm, setShowUnassignConfirm] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUnassigning, setIsUnassigning] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const isActive = section.status === 'Active';
  const hasClassTeacher = Boolean(section.classTeacherId);
  const studentsHref = `/dashboard/students?class=${encodeURIComponent(className)}&section=${encodeURIComponent(section.name)}&session=${encodeURIComponent(academicSession)}`;

  const handleToggleStatus = async () => {
    setIsUpdating(true);
    try {
      await updateSectionStatus(classId, section.id, isActive ? 'Inactive' : 'Active');
      setShowConfirm(false);
      setToastMessage(isActive ? 'Section deactivated.' : 'Section activated.');
      router.refresh();
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUnassignClassTeacher = async () => {
    setIsUnassigning(true);
    try {
      await assignSectionTeacher(classId, section.id, '');
      setShowUnassignConfirm(false);
      setToastMessage('Class teacher unassigned.');
      router.refresh();
    } finally {
      setIsUnassigning(false);
    }
  };

  const menuItems = [
    {
      label: hasClassTeacher ? 'Change Class Teacher' : 'Assign Class Teacher',
      icon: <FiUserPlus className="w-4 h-4" />,
      onClick: () => setShowAssignModal(true),
    },
    ...(hasClassTeacher
      ? [
          {
            label: 'Unassign Class Teacher',
            icon: <FiUserMinus className="w-4 h-4" />,
            onClick: () => setShowUnassignConfirm(true),
            danger: true,
          },
        ]
      : []),
    {
      label: isActive ? 'Deactivate' : 'Activate',
      icon: isActive ? <FiUserX className="w-4 h-4" /> : <FiUserCheck className="w-4 h-4" />,
      onClick: () => setShowConfirm(true),
      danger: isActive,
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition overflow-hidden">
      <div className="p-6 flex flex-col gap-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link
              href={`/dashboard/classes/${classId}/sections/${section.id}`}
              className="text-xl font-bold text-gray-900 hover:text-indigo-700"
            >
              Section {section.name}
            </Link>
            <div className="mt-2 flex w-fit items-center gap-1.5 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-1">
              <FiUsers className="w-3.5 h-3.5 text-gray-400" />
              {section.studentCount} Students
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!isActive && <Badge label="Inactive" variant="gray" />}
            <DropdownMenu trigger={<FiMoreVertical className="w-4 h-4" />} items={menuItems} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-violet-100 text-violet-600 shrink-0">
            <FiLayers className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Class Teacher</p>
            <p className="text-base font-bold text-gray-900 truncate">{section.classTeacherName || 'Unassigned'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-100 text-amber-600 shrink-0">
            <FiMapPin className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Room</p>
            <p className="text-base font-bold text-gray-900 truncate">{section.room || '—'}</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Demographics</p>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                <span className="font-semibold text-gray-900">{section.boys}</span>
                <span className="text-gray-500">Boys</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-pink-500 shrink-0" />
                <span className="font-semibold text-gray-900">{section.girls}</span>
                <span className="text-gray-500">Girls</span>
              </span>
            </div>
            <p className="text-sm font-bold text-gray-900 shrink-0">
              {section.studentCount} <span className="text-gray-400 font-normal">/ {section.capacity}</span>
            </p>
          </div>

          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mt-3">
            <div
              className={`h-full rounded-full ${CAPACITY_BAR_COLOR[section.capacityState]}`}
              style={{ width: `${section.capacityPercent}%` }}
            />
          </div>

          {section.capacityState !== 'normal' && (
            <p
              className={`flex items-center gap-1.5 text-xs font-medium mt-2 ${
                section.capacityState === 'over' ? 'text-red-600' : 'text-amber-600'
              }`}
            >
              <FiAlertTriangle className="w-3.5 h-3.5" />
              {section.capacityState === 'over' ? 'Over capacity' : 'Capacity reached'}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Link
            href={studentsHref}
            className="flex-1 text-center px-3 py-2.5 rounded-lg text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition cursor-pointer"
          >
            View Students
          </Link>
          <button
            type="button"
            onClick={() => setShowEditModal(true)}
            className="flex-1 px-3 py-2.5 rounded-lg text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition cursor-pointer"
          >
            Edit
          </button>
        </div>
      </div>

      <SectionFormModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        classId={classId}
        className={className}
        academicSession={academicSession}
        section={section}
        teacherOptions={teacherOptions}
        onSuccess={(message) => {
          setShowEditModal(false);
          setToastMessage(message);
          router.refresh();
        }}
      />

      <AssignSectionTeacherModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        classId={classId}
        section={section}
        teacherOptions={teacherOptions}
        onSuccess={(message) => {
          setShowAssignModal(false);
          setToastMessage(message);
          router.refresh();
        }}
      />

      <ConfirmDialog
        isOpen={showUnassignConfirm}
        onClose={() => setShowUnassignConfirm(false)}
        onConfirm={handleUnassignClassTeacher}
        title="Unassign class teacher?"
        description={`${section.classTeacherName || 'This teacher'} will no longer be the class teacher of Section ${section.name}.`}
        confirmLabel="Unassign"
        isLoading={isUnassigning}
      />

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleToggleStatus}
        title={isActive ? 'Deactivate section?' : 'Activate section?'}
        description={
          isActive
            ? `Section ${section.name} will be marked inactive. You can reactivate it anytime.`
            : `Section ${section.name} will be marked active again.`
        }
        confirmLabel={isActive ? 'Deactivate' : 'Activate'}
        isLoading={isUpdating}
      />

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}
