import { NextResponse } from 'next/server';
import { getMonthlyReportDashboard } from '@/lib/performance/monthlyReports';
import { requirePermission } from '@/lib/rbac';
import { getCurrentUserInfo } from '@/lib/iam';
import { getCurrentUser } from '@/lib/currentUser';

export async function GET(request) {
  const { error } = await requirePermission('performanceReports.view');
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const academicSession = searchParams.get('academicSession');
  const month = searchParams.get('month');
  if (!academicSession || !month) {
    return NextResponse.json({ error: 'academicSession and month are required.' }, { status: 400 });
  }

  const currentUser = (await getCurrentUserInfo()) || (await getCurrentUser());
  const dashboard = await getMonthlyReportDashboard({
    academicSession,
    month,
    className: searchParams.get('class') || '',
    sectionName: searchParams.get('section') || '',
    search: searchParams.get('search') || '',
    currentUser,
  });
  return NextResponse.json(dashboard);
}
