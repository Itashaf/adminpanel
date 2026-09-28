import { NextResponse } from 'next/server';
import { setYearlyRemark } from '@/lib/performance/yearlyReports';
import { requirePermission } from '@/lib/rbac';
import { getCurrentUserInfo } from '@/lib/iam';
import { getCurrentUser } from '@/lib/currentUser';

export async function PUT(request, { params }) {
  const { error } = await requirePermission('performanceReports.yearly.manage');
  if (error) return error;

  const { studentId } = await params;
  const { academicSession, teacherRemark } = await request.json();
  if (!academicSession) return NextResponse.json({ error: 'academicSession is required.' }, { status: 400 });

  const currentUser = (await getCurrentUserInfo()) || (await getCurrentUser());
  try {
    const report = await setYearlyRemark(currentUser, studentId, academicSession, teacherRemark);
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
