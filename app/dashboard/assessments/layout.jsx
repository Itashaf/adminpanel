import { requireFeatureEnabled } from '@/lib/featureFlagGuard';

export default async function AssessmentsLayout({ children }) {
  await requireFeatureEnabled('assessments');
  return children;
}
