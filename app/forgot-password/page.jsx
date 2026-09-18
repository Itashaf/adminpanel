import ForgotPasswordForm from '@/components/ForgotPasswordForm';

export const metadata = {
  title: 'Forgot Password | SchoolApp 360',
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-50 px-4 py-4 overflow-y-auto">
      <ForgotPasswordForm />
    </div>
  );
}
