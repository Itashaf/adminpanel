import PageLoader from '@/components/PageLoader';

// Generic fallback — overrides app/dashboard/exams/loading.jsx (a bespoke
// skeleton for the Exam Dashboard index specifically) so it doesn't leak
// into this much more complex tabbed detail page.
export default function Loading() {
  return <PageLoader label="Loading exam..." fullScreen={false} />;
}
