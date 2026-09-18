'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiFile,
  FiUploadCloud,
  FiPlus,
  FiUser,
  FiBookOpen,
  FiCreditCard,
  FiPhoneCall,
  FiMapPin,
  FiLayers,
} from 'react-icons/fi';
import ConfirmDialog from '@/components/ConfirmDialog';
import Toast from '@/components/Toast';
import InfoCard from './InfoCard';
import AssignmentCard from './AssignmentCard';
import AssignClassModal from './AssignClassModal';
import { removeTeacherAssignment } from '@/lib/api';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'assignments', label: 'Assignments' },
  { key: 'documents', label: 'Documents' },
  { key: 'attendance', label: 'Attendance', comingSoon: true },
  { key: 'timetable', label: 'Timetable', comingSoon: true },
];

const DOCUMENT_TYPES = [
  { label: 'Aadhaar Card', required: true, getFileName: (teacher) => teacher.aadhaarDocumentName },
  { label: '10th Certificate' },
  { label: '12th Certificate' },
  { label: 'Graduation Certificate' },
  { label: 'Work Experience Certificate' },
  { label: 'Qualification Certificate' },
  { label: 'ID Proof' },
  { label: 'Joining Document' },
  { label: 'Other Document' },
];

function formatDate(dateString) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function TeacherProfileTabs({ teacher, classOptions }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleRemove = async () => {
    if (!removeTarget) return;
    setIsRemoving(true);
    try {
      await removeTeacherAssignment(teacher.id, removeTarget);
      setRemoveTarget(null);
      setShowToast(true);
      router.refresh();
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-1 border-b border-gray-100 overflow-x-auto mb-5">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            disabled={tab.comingSoon}
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-4 py-3 text-sm font-medium whitespace-nowrap transition ${
              tab.comingSoon
                ? 'text-gray-300 cursor-not-allowed'
                : activeTab === tab.key
                ? 'text-indigo-700 cursor-pointer'
                : 'text-gray-500 hover:text-gray-700 cursor-pointer'
            }`}
          >
            {tab.label}
            {tab.comingSoon && (
              <span className="ml-1.5 text-[10px] font-medium bg-gray-100 text-gray-400 rounded-full px-1.5 py-0.5">
                Soon
              </span>
            )}
            {activeTab === tab.key && !tab.comingSoon && (
              <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-4">
          <InfoCard
            title="Personal Information"
            subtitle="Basic identity and employment details."
            icon={FiUser}
            fields={[
              { label: 'Date of Birth', value: formatDate(teacher.dob) },
              { label: 'Gender', value: teacher.gender },
              { label: 'Blood Group', value: teacher.bloodGroup },
              { label: 'Marital Status', value: teacher.maritalStatus },
              { label: 'Nationality', value: teacher.nationality },
              { label: 'PAN Number', value: teacher.panNumber },
              { label: 'Employment Type', value: teacher.employmentType },
              { label: 'Specialization', value: teacher.specialization },
              { label: 'Aadhaar Number', value: teacher.aadhaarNumber },
            ]}
          />

          <InfoCard
            title="Education"
            subtitle="School and graduation qualifications."
            icon={FiBookOpen}
            fields={[
              { label: '10th Marks / Percentage', value: teacher.education?.tenthPercentage },
              { label: '12th Marks / Percentage', value: teacher.education?.twelfthPercentage },
              { label: 'Graduation Degree', value: teacher.education?.graduationDegree },
              { label: 'University / College', value: teacher.education?.graduationUniversity },
            ]}
          />

          <InfoCard
            title="Bank Details"
            subtitle="Account used for salary transfer."
            icon={FiCreditCard}
            fields={[
              { label: 'Account Holder Name', value: teacher.bankDetails?.accountHolderName },
              { label: 'Bank Name', value: teacher.bankDetails?.bankName },
              { label: 'Account Number', value: teacher.bankDetails?.accountNumber },
              { label: 'IFSC Code', value: teacher.bankDetails?.ifsc },
            ]}
          />

          <InfoCard
            title="Emergency Contact"
            subtitle="Who to reach in case of an emergency."
            icon={FiPhoneCall}
            fields={[
              { label: 'Name', value: teacher.emergencyContact?.name },
              { label: 'Phone', value: teacher.emergencyContact?.phone },
              { label: 'Relationship', value: teacher.emergencyContact?.relationship },
            ]}
          />

          <InfoCard
            title="Address"
            subtitle="Current residential address on file."
            icon={FiMapPin}
            fields={[
              { label: 'Address Line 1', value: teacher.address?.line1 },
              { label: 'Address Line 2', value: teacher.address?.line2 },
              { label: 'City', value: teacher.address?.city },
              { label: 'State', value: teacher.address?.state },
              { label: 'PIN Code', value: teacher.address?.pinCode },
            ]}
          />
        </div>
      )}

      {activeTab === 'assignments' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div className="flex items-center gap-4">
              <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-violet-100 text-violet-600 shrink-0">
                <FiLayers className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Current Assignments</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Academic Session {teacher.assignments[0]?.academicSession || '—'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAssignModal(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 hover:opacity-90 transition cursor-pointer shrink-0"
            >
              <FiPlus className="w-4 h-4" />
              Assign Class
            </button>
          </div>

          {teacher.assignments.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {teacher.assignments.map((assignment) => (
                <AssignmentCard key={assignment.id} assignment={assignment} onRemove={setRemoveTarget} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-10">No classes assigned yet.</p>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
          <div className="flex items-center gap-4 mb-6">
            <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-violet-100 text-violet-600 shrink-0">
              <FiFile className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Documents</h3>
              <p className="text-sm text-gray-500 mt-0.5">Identity and qualification documents on file.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DOCUMENT_TYPES.map((doc) => {
              const fileName = doc.getFileName?.(teacher);
              const isUploaded = Boolean(fileName);

              return (
                <div key={doc.label} className="flex items-center gap-3 bg-gray-50 rounded-xl p-4">
                  <span
                    className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${
                      isUploaded ? 'bg-violet-100 text-violet-600' : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    <FiFile className="w-4 h-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {doc.label} {doc.required && <span className="text-red-500">*</span>}
                    </p>
                    <p className={`flex items-center gap-1.5 text-xs mt-0.5 ${isUploaded ? 'text-green-600' : 'text-gray-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isUploaded ? 'bg-green-600' : 'bg-gray-300'}`} />
                      <span className="truncate">{isUploaded ? fileName : 'Not uploaded'}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    className="flex items-center justify-center w-9 h-9 rounded-xl text-indigo-600 bg-white hover:bg-indigo-50 cursor-pointer shrink-0"
                  >
                    <FiUploadCloud className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <AssignClassModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        teacherId={teacher.id}
        existingAssignments={teacher.assignments}
        classOptions={classOptions}
        onSuccess={() => {
          setShowAssignModal(false);
          router.refresh();
        }}
      />

      <ConfirmDialog
        isOpen={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemove}
        title="Remove assignment?"
        description="This teacher will no longer be assigned to this class and section."
        confirmLabel="Remove"
        isLoading={isRemoving}
      />

      {showToast && <Toast message="Assignment removed." onClose={() => setShowToast(false)} />}
    </div>
  );
}
