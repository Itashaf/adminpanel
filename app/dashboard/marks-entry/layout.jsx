import { requireFeatureEnabled } from '@/lib/featureFlagGuard';

export default async function MarksEntryLayout({ children }) {
  await requireFeatureEnabled('exams');
  return children;
}
