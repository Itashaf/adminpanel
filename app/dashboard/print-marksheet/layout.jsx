import { requireFeatureEnabled } from '@/lib/featureFlagGuard';

export default async function PrintMarksheetLayout({ children }) {
  await requireFeatureEnabled('exams');
  return children;
}
