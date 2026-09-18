'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FiCheckCircle } from 'react-icons/fi';
import Button from '@/components/Button';
import Toast from '@/components/Toast';
import TeacherForm from './TeacherForm';
import { createTeacher } from '@/lib/api';

export default function AddTeacherForm() {
  const [showToast, setShowToast] = useState(false);
  const [createdTeacher, setCreatedTeacher] = useState(null);

  const handleSubmit = async (data) => {
    const result = await createTeacher(data);
    setCreatedTeacher(result);
    setShowToast(true);
  };

  if (createdTeacher) {
    return (
      <>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 flex flex-col items-center text-center max-w-lg mx-auto">
          <span className="flex items-center justify-center w-14 h-14 rounded-full bg-green-50 mb-4">
            <FiCheckCircle className="w-7 h-7 text-green-600" />
          </span>
          <h2 className="text-lg font-semibold text-indigo-700">Teacher added successfully</h2>
          <p className="text-sm text-gray-500 mt-2">
            {createdTeacher.firstName} {createdTeacher.lastName}
            <br />
            <span className="font-semibold text-gray-900 text-base">{createdTeacher.employeeId}</span>
          </p>

          {createdTeacher.loginInviteSent && (
            <div className="w-full mt-5">
              <p className="text-sm text-gray-600 bg-indigo-50 rounded-lg px-4 py-3">
                An email has been sent to their login email with a link to set up their own password.
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 w-full mt-6">
            <Link href="/dashboard/teachers" className="flex-1">
              <Button label="Back to Teachers" variant="secondary" fullWidth />
            </Link>
            <Link href={`/dashboard/teachers/${createdTeacher.id}`} className="flex-1">
              <Button label="View Teacher Profile" fullWidth />
            </Link>
          </div>
        </div>

        {showToast && <Toast message="Teacher added successfully." onClose={() => setShowToast(false)} />}
      </>
    );
  }

  return <TeacherForm onSubmit={handleSubmit} submitLabel="Save Teacher" />;
}
