import { NextResponse } from 'next/server';
import { getMonthlyReport } from '@/lib/performance/monthlyReports';
import { requirePermission } from '@/lib/rbac';
import { getCurrentUserInfo } from '@/lib/iam';
import { getCurrentUser } from '@/lib/currentUser';

export async function GET(request, { params }) {
  const { error } = await requirePermission('performanceReports.view');
  if (error) return error;

  const { studentId } = await params;
  const { searchParams } = new URL(request.url);
  const academicSession = searchParams.get('academicSession');
  const month = searchParams.get('month');
  if (!academicSession || !month) {
    return NextResponse.json({ error: 'academicSession and month are required.' }, { status: 400 });
  }

  const currentUser = (await getCurrentUserInfo()) || (await getCurrentUser());
  try {
    const report = await getMonthlyReport(currentUser, studentId, academicSession, month);
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
