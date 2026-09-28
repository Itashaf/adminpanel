import { NextResponse } from 'next/server';
import { getYearlyReportDashboard } from '@/lib/performance/yearlyReports';
import { requirePermission } from '@/lib/rbac';
import { getCurrentUserInfo } from '@/lib/iam';
import { getCurrentUser } from '@/lib/currentUser';

export async function GET(request) {
  const { error } = await requirePermission('performanceReports.view');
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const academicSession = searchParams.get('academicSession');
  if (!academicSession) {
    return NextResponse.json({ error: 'academicSession is required.' }, { status: 400 });
  }

  const currentUser = (await getCurrentUserInfo()) || (await getCurrentUser());
  const dashboard = await getYearlyReportDashboard({
    academicSession,
    className: searchParams.get('class') || '',
    sectionName: searchParams.get('section') || '',
    search: searchParams.get('search') || '',
    currentUser,
  });
  return NextResponse.json(dashboard);
}
