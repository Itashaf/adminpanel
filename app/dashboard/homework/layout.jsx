import { requireFeatureEnabled } from '@/lib/featureFlagGuard';

export default async function HomeworkLayout({ children }) {
  await requireFeatureEnabled('homework');
  return children;
}
