import SuperAdminLoginForm from '@/components/SuperAdminLoginForm';
import LoginLeftPanel from '@/components/LoginLeftPanel';

export const metadata = {
  title: 'Super Admin Sign In | SchoolApp 360',
};

export default function HomePage() {
  return (
    <div className="flex flex-1 h-full overflow-hidden">
      <LoginLeftPanel />
      <SuperAdminLoginForm />
    </div>
  );
}
