import { redirect } from 'next/navigation';
import { blockIfNotAdminTier } from '@/lib/roleGuard';

export default async function SettingsIndexPage() {
  await blockIfNotAdminTier();
  redirect('/dashboard/settings/profile');
}
