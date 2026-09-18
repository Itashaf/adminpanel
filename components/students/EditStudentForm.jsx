'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Toast from '@/components/Toast';
import StudentForm from './StudentForm';
import { updateStudent } from '@/lib/api';

export default function EditStudentForm({ student, classOptions }) {
  const router = useRouter();
  const [showToast, setShowToast] = useState(false);

  const defaultValues = {
    photoUrl: student.photoUrl || null,
    // Read directly by StudentForm's local file-upload state (Father/Mother
    // Photo, Birth Certificate, SLC, Other Document) — not a react-hook-form
    // field itself, just riding along on the same defaultValues object.
    documents: student.documents || {},
    firstName: student.firstName,
    middleName: student.middleName || '',
    lastName: student.lastName,
    dob: student.dob,
    gender: student.gender,
    bloodGroup: student.bloodGroup || '',
    nationality: student.nationality || '',
    aadhaarNumber: student.aadhaarNumber || '',
    // Prefer the real uploaded URL when one exists (so re-saving without
    // touching this field keeps it, instead of silently dropping back to
    // just a filename — see StudentForm.jsx's resolvedDocumentUrl) — only
    // legacy rows saved before this existed fall back to the bare filename.
    aadhaarDocument: student.aadhaarDocumentUrl || student.aadhaarDocumentName || '',
    whatsappNumber: student.whatsappNumber || '',
    admissionNumber: student.admissionId,
    admissionDate: student.admissionDate,
    academicSession: student.academicSession,
    class: student.class,
    section: student.section,
    status: student.status,
    previousSchoolName: student.previousSchool?.name || '',
    previousSchoolBoard: student.previousSchool?.board || '',
    lastClassPercentage: student.previousSchool?.lastClassPercentage || '',
    primaryEmergencyName: student.emergencyContacts?.primary?.name || '',
    primaryEmergencyRelationship: student.emergencyContacts?.primary?.relationship || '',
    primaryEmergencyPhone: student.emergencyContacts?.primary?.phone || '',
    secondaryEmergencyName: student.emergencyContacts?.secondary?.name || '',
    secondaryEmergencyRelationship: student.emergencyContacts?.secondary?.relationship || '',
    secondaryEmergencyPhone: student.emergencyContacts?.secondary?.phone || '',
    trustedRelativePhone: student.emergencyContacts?.trustedRelativePhone || '',
    admissionFeePaidDate: student.feeDetails?.admissionFeePaidDate || '',
    admissionFeeAmount: student.feeDetails?.admissionFeeAmount || '',
    feeStructureType: student.feeDetails?.structureType || '',
    feeStructureAmount: student.feeDetails?.structureAmount || '',
    feePaymentStatus: student.feeDetails?.paymentStatus || '',
    outstandingDues: student.feeDetails?.outstandingDues || '',
    guardian: {
      relationship: student.guardian.relationship,
      fullName: student.guardian.fullName,
      phone: student.guardian.phone,
      email: student.guardian.email || '',
      occupation: student.guardian.occupation || '',
      aadhaarNumber: student.guardian.aadhaarNumber || '',
      aadhaarDocument: student.guardian.aadhaarDocumentUrl || student.guardian.aadhaarDocumentName || '',
    },
    secondaryGuardian: student.secondaryGuardian
      ? {
          relationship: student.secondaryGuardian.relationship || '',
          fullName: student.secondaryGuardian.fullName || '',
          phone: student.secondaryGuardian.phone || '',
          email: student.secondaryGuardian.email || '',
          occupation: student.secondaryGuardian.occupation || '',
          aadhaarNumber: student.secondaryGuardian.aadhaarNumber || '',
          aadhaarDocument: student.secondaryGuardian.aadhaarDocumentUrl || student.secondaryGuardian.aadhaarDocumentName || '',
        }
      : {
          relationship: '',
          fullName: '',
          phone: '',
          email: '',
          occupation: '',
          aadhaarNumber: '',
          aadhaarDocument: '',
        },
    addressLine1: student.address.line1,
    addressLine2: student.address.line2 || '',
    city: student.address.city,
    state: student.address.state,
    pinCode: student.address.pinCode,
  };

  const handleSubmit = async (data) => {
    await updateStudent(student.id, data);
    setShowToast(true);
    setTimeout(() => router.push(`/dashboard/students/${student.id}`), 900);
  };

  return (
    <>
      <StudentForm
        classOptions={classOptions}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        submitLabel="Save Changes"
        cancelHref={`/dashboard/students/${student.id}`}
      />

      {showToast && (
        <Toast message="Student updated successfully." onClose={() => setShowToast(false)} />
      )}
    </>
  );
}
