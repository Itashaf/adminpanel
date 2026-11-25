import EmailStatsExplorer from '@/components/superadmin/EmailStatsExplorer';

export const metadata = {
  title: 'Email | SchoolApp 360 Super Admin',
};

// Client-fetched (GET /api/superadmin/email-stats), nothing to prerender.
export const dynamic = 'force-dynamic';

export default function SuperAdminEmailPage() {
  return <EmailStatsExplorer />;
}
