'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  FiFile,
  FiUploadCloud,
  FiUser,
  FiBookOpen,
  FiUsers,
  FiPhoneCall,
  FiMapPin,
  FiLayers,
} from 'react-icons/fi';
import InfoCard from './InfoCard';
import GuardianCard from './GuardianCard';
import StudentAttendanceTab from './StudentAttendanceTab';
import StudentFeesTab from './StudentFeesTab';

const ALL_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'academic', label: 'Academic' },
  { key: 'fees', label: 'Fees' },
  { key: 'documents', label: 'Documents' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'exams', label: 'Exams', comingSoon: true },
];

// Fees and Documents are financial/administrative records, not something a
// Teacher needs to browse for a student in their class — a Teacher's own
// reason to be on this page is almost always Attendance (reached from the
// Attendance Report's "View Attendance" link), so keep their tab bar to
// just Overview/Academic/Attendance instead of exposing every admin tab.
const TEACHER_TABS = ['overview', 'academic', 'attendance'];

const DOCUMENT_TYPES = [
  { label: 'Aadhaar Card', required: true, getFileName: (student) => student.aadhaarDocumentName },
  { label: 'Father Aadhaar', required: true, getFileName: (student) => student.guardian?.aadhaarDocumentName },
  { label: 'Mother Aadhaar', getFileName: (student) => student.secondaryGuardian?.aadhaarDocumentName },
  { label: 'Student Photo' },
  { label: 'Father Photo' },
  { label: 'Mother Photo' },
  { label: 'Birth Certificate' },
  { label: 'School Leaving Certificate (SLC)' },
  { label: 'Other Document' },
];

function formatDate(dateString) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ProfileTabs({ student, initialTab, canManage = true }) {
  const TABS = canManage ? ALL_TABS : ALL_TABS.filter((t) => TEACHER_TABS.includes(t.key));

  // `initialTab` comes from the page's `?tab=` search param (e.g. the
  // Attendance Report table's "View Attendance" link) — validated against
  // the real, non-comingSoon tab keys so an unrecognized or disabled value
  // can't leave the tab bar showing no active tab at all.
  const isValidTab = TABS.some((t) => t.key === initialTab && !t.comingSoon);
  const [activeTab, setActiveTab] = useState(isValidTab ? initialTab : 'overview');

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Keeps `?tab=` in sync with whichever tab is active — not just the
  // initial load — so every tab (not only Attendance, reached via the
  // Attendance Report's "View Attendance" link) is itself shareable/
  // refreshable as a direct URL. `replace` (not `push`) + `scroll: false`
  // so switching tabs doesn't grow the back-button history or jump the page.
  function selectTab(key) {
    setActiveTab(key);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', key);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div>
      <div className="flex items-center gap-1 border-b border-gray-100 overflow-x-auto mb-5">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            disabled={tab.comingSoon}
            onClick={() => selectTab(tab.key)}
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
            subtitle="Basic identity and contact details."
            icon={FiUser}
            fields={[
              { label: 'Date of Birth', value: formatDate(student.dob) },
              { label: 'Gender', value: student.gender },
              { label: 'Blood Group', value: student.bloodGroup },
              { label: 'Admission Date', value: formatDate(student.admissionDate) },
              { label: 'Nationality', value: student.nationality },
              { label: 'Aadhaar Number', value: student.aadhaarNumber },
              { label: 'WhatsApp Number', value: student.whatsappNumber },
            ]}
          />

          <InfoCard
            title="Previous School"
            subtitle="Academic record before joining this school."
            icon={FiBookOpen}
            fields={[
              { label: 'School Name', value: student.previousSchool?.name },
              { label: 'Board', value: student.previousSchool?.board },
              { label: 'Last Class Percentage / Marks', value: student.previousSchool?.lastClassPercentage },
            ]}
          />

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-6">
              <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-violet-100 text-violet-600 shrink-0">
                <FiUsers className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Parent / Guardian</h3>
                <p className="text-sm text-gray-500 mt-0.5">Primary and secondary guardian contacts.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <GuardianCard guardian={student.guardian} />
              {student.secondaryGuardian && <GuardianCard guardian={student.secondaryGuardian} />}
            </div>
          </div>

          <InfoCard
            title="Emergency Contacts"
            subtitle="Who to reach in case of an emergency."
            icon={FiPhoneCall}
            fields={[
              { label: 'Primary Contact', value: student.emergencyContacts?.primary?.name },
              { label: 'Primary Relationship', value: student.emergencyContacts?.primary?.relationship },
              { label: 'Primary Phone', value: student.emergencyContacts?.primary?.phone },
              { label: 'Secondary Contact', value: student.emergencyContacts?.secondary?.name },
              { label: 'Secondary Relationship', value: student.emergencyContacts?.secondary?.relationship },
              { label: 'Secondary Phone', value: student.emergencyContacts?.secondary?.phone },
              { label: 'Trusted Relative / Guardian Phone', value: student.emergencyContacts?.trustedRelativePhone },
            ]}
          />

          <InfoCard
            title="Address"
            subtitle="Current residential address on file."
            icon={FiMapPin}
            fields={[
              { label: 'Address Line 1', value: student.address?.line1 },
              { label: 'Address Line 2', value: student.address?.line2 },
              { label: 'City', value: student.address?.city },
              { label: 'State', value: student.address?.state },
              { label: 'PIN Code', value: student.address?.pinCode },
            ]}
          />
        </div>
      )}

      {activeTab === 'academic' && (
        <InfoCard
          title="Academic Record"
          subtitle="Current class placement and enrollment status."
          icon={FiLayers}
          fields={[
            { label: 'Academic Session', value: student.academicSession },
            { label: 'Class', value: student.class },
            { label: 'Section', value: student.section },
            { label: 'Admission Date', value: formatDate(student.admissionDate) },
            { label: 'Status', value: student.status },
          ]}
        />
      )}

      {activeTab === 'fees' && <StudentFeesTab student={student} canManage={canManage} />}

      {activeTab === 'attendance' && <StudentAttendanceTab studentId={student.id} admissionDate={student.admissionDate} />}

      {activeTab === 'documents' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
          <div className="flex items-center gap-4 mb-6">
            <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-violet-100 text-violet-600 shrink-0">
              <FiFile className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Documents</h3>
              <p className="text-sm text-gray-500 mt-0.5">Identity and enrollment documents on file.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DOCUMENT_TYPES.map((doc) => {
              const fileName = doc.getFileName?.(student);
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
    </div>
  );
}
