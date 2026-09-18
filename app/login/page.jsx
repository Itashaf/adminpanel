import { Suspense } from 'react';
import LoginForm from '@/components/LoginForm';
import LoginLeftPanel from '@/components/LoginLeftPanel';

export const metadata = {
  title: 'Sign In | SchoolApp 360',
};

export default function LoginPage() {
  return (
    <div className="flex flex-1 h-full overflow-hidden">
      <LoginLeftPanel />
      {/* LoginForm reads the ?role= query param via useSearchParams, which
          Next.js requires a Suspense boundary for. */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
