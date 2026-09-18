import SettingsNav from '@/components/settings/SettingsNav';
import { blockIfTeacher } from '@/lib/roleGuard';

export default async function SettingsLayout({ children }) {
  await blockIfTeacher();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">School Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure your school&apos;s profile, branding and preferences.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <SettingsNav />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
