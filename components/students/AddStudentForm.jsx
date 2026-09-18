'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FiCheckCircle } from 'react-icons/fi';
import Button from '@/components/Button';
import Toast from '@/components/Toast';
import StudentForm from './StudentForm';
import { createStudent } from '@/lib/api';

export default function AddStudentForm({ classOptions }) {
  const [showToast, setShowToast] = useState(false);
  const [createdStudent, setCreatedStudent] = useState(null);

  const handleSubmit = async (data) => {
    const result = await createStudent(data);
    setCreatedStudent(result);
    setShowToast(true);
  };

  if (createdStudent) {
    return (
      <>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 flex flex-col items-center text-center max-w-lg mx-auto">
          <span className="flex items-center justify-center w-14 h-14 rounded-full bg-green-50 mb-4">
            <FiCheckCircle className="w-7 h-7 text-green-600" />
          </span>
          <h2 className="text-lg font-semibold text-indigo-700">Student added successfully</h2>
          <p className="text-sm text-gray-500 mt-2">
            Admission ID
            <br />
            <span className="font-semibold text-gray-900 text-base">{createdStudent.admissionId}</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full mt-6">
            <Link href="/dashboard/students" className="flex-1">
              <Button label="Back to Students" variant="secondary" fullWidth />
            </Link>
            <Link href={`/dashboard/students/${createdStudent.id}`} className="flex-1">
              <Button label="View Student Profile" fullWidth />
            </Link>
          </div>
        </div>

        {showToast && (
          <Toast message="Student added successfully." onClose={() => setShowToast(false)} />
        )}
      </>
    );
  }

  return <StudentForm classOptions={classOptions} onSubmit={handleSubmit} submitLabel="Save Student" />;
}
