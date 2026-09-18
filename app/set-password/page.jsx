import Link from 'next/link';
import { FiAlertCircle } from 'react-icons/fi';
import SetPasswordForm from '@/components/SetPasswordForm';
import { getTeacherByPasswordToken } from '@/lib/teachers';

export const metadata = {
  title: 'Set Password | SchoolApp 360',
};

export default async function SetPasswordPage({ searchParams }) {
  const { token } = await searchParams;
  const teacher = token ? await getTeacherByPasswordToken(token) : null;

  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-50 px-4 py-4 overflow-y-auto">
      {teacher ? (
        <SetPasswordForm token={token} teacherName={`${teacher.firstName} ${teacher.lastName}`} />
      ) : (
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-10">
          <div className="flex flex-col items-center text-center">
            <span className="flex items-center justify-center w-14 h-14 rounded-full bg-red-100 mb-5">
              <FiAlertCircle className="w-7 h-7 text-red-600" />
            </span>
            <h2 className="text-lg font-semibold text-gray-900">Link invalid or expired</h2>
            <p className="text-sm text-gray-500 mt-2 mb-6">
              This password link is no longer valid. Ask your school admin to send you a new one.
            </p>
            <Link
              href="/login"
              className="text-sm font-semibold text-indigo-700 hover:text-indigo-900 cursor-pointer"
            >
              Back to Login
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
