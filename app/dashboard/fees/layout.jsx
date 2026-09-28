import { requireFeatureEnabled } from '@/lib/featureFlagGuard';

export default async function FeesLayout({ children }) {
  await requireFeatureEnabled('fees');
  return children;
}
