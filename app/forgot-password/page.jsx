import ForgotPasswordForm from '@/components/ForgotPasswordForm';

export const metadata = {
  title: 'Forgot Password | SchoolApp 360',
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-violet-700 via-indigo-600 to-blue-600 px-4 py-4 overflow-y-auto">
      <ForgotPasswordForm />
    </div>
  );
}
