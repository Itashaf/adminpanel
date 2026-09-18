'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Toast from '@/components/Toast';
import TeacherForm from './TeacherForm';
import { updateTeacher } from '@/lib/api';

export default function EditTeacherForm({ teacher }) {
  const router = useRouter();
  const [showToast, setShowToast] = useState(false);

  const defaultValues = {
    photoUrl: teacher.photoUrl || null,
    // Read directly by TeacherForm's local file-upload state (10th/12th/
    // Graduation/Work Experience certificates) — not a react-hook-form
    // field itself, just riding along on this same defaultValues object.
    documents: teacher.documents || {},
    firstName: teacher.firstName,
    middleName: teacher.middleName || '',
    lastName: teacher.lastName,
    dob: teacher.dob || '',
    gender: teacher.gender,
    bloodGroup: teacher.bloodGroup || '',
    phone: teacher.phone,
    email: teacher.email,
    aadhaarNumber: teacher.aadhaarNumber || '',
    // Prefer the real uploaded URL when one exists (so re-saving without
    // touching this field keeps it) — only legacy rows saved before this
    // existed fall back to the bare filename.
    aadhaarDocument: teacher.aadhaarDocumentUrl || teacher.aadhaarDocumentName || '',
    maritalStatus: teacher.maritalStatus || '',
    nationality: teacher.nationality || '',
    panNumber: teacher.panNumber || '',
    employeeId: teacher.employeeId,
    joiningDate: teacher.joiningDate,
    relievingDate: teacher.relievingDate || '',
    qualification: teacher.qualification,
    specialization: teacher.specialization || '',
    experience: teacher.experience || '',
    employmentType: teacher.employmentType,
    status: teacher.status,
    isFresher: teacher.isFresher ?? true,
    tenthPercentage: teacher.education?.tenthPercentage || '',
    twelfthPercentage: teacher.education?.twelfthPercentage || '',
    graduationDegree: teacher.education?.graduationDegree || '',
    graduationUniversity: teacher.education?.graduationUniversity || '',
    bankAccountHolderName: teacher.bankDetails?.accountHolderName || '',
    bankName: teacher.bankDetails?.bankName || '',
    bankAccountNumber: teacher.bankDetails?.accountNumber || '',
    bankIFSC: teacher.bankDetails?.ifsc || '',
    emergencyContactName: teacher.emergencyContact?.name || '',
    emergencyContactPhone: teacher.emergencyContact?.phone || '',
    emergencyContactRelationship: teacher.emergencyContact?.relationship || '',
    accountStatus: teacher.loginAccess?.accountStatus || 'Active',
    addressLine1: teacher.address?.line1 || '',
    addressLine2: teacher.address?.line2 || '',
    city: teacher.address?.city || '',
    state: teacher.address?.state || '',
    pinCode: teacher.address?.pinCode || '',
  };

  const handleSubmit = async (data) => {
    await updateTeacher(teacher.id, data);
    setShowToast(true);
    setTimeout(() => router.push(`/dashboard/teachers/${teacher.id}`), 900);
  };

  return (
    <>
      <TeacherForm
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        submitLabel="Save Changes"
        cancelHref={`/dashboard/teachers/${teacher.id}`}
      />

      {showToast && <Toast message="Teacher updated successfully." onClose={() => setShowToast(false)} />}
    </>
  );
}
