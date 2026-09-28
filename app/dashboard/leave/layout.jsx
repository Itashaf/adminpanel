import { requireFeatureEnabled } from '@/lib/featureFlagGuard';

export default async function LeaveLayout({ children }) {
  await requireFeatureEnabled('leave');
  return children;
}
