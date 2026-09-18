import SetupWizard from '@/components/setup/SetupWizard';

export const metadata = {
  title: 'Set Up Your School | SchoolApp 360',
};

export default function SetupPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-50 px-4 py-8 overflow-y-auto">
      <SetupWizard />
    </div>
  );
}
