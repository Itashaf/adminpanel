import { NextResponse } from 'next/server';
import { getYearlyReport } from '@/lib/performance/yearlyReports';
import { requirePermission } from '@/lib/rbac';
import { getCurrentUserInfo } from '@/lib/iam';
import { getCurrentUser } from '@/lib/currentUser';

export async function GET(request, { params }) {
  const { error } = await requirePermission('performanceReports.view');
  if (error) return error;

  const { studentId } = await params;
  const { searchParams } = new URL(request.url);
  const academicSession = searchParams.get('academicSession');
  if (!academicSession) {
    return NextResponse.json({ error: 'academicSession is required.' }, { status: 400 });
  }

  const currentUser = (await getCurrentUserInfo()) || (await getCurrentUser());
  try {
    const report = await getYearlyReport(currentUser, studentId, academicSession);
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
