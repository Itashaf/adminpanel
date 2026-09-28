import { NextResponse } from 'next/server';
import { setYearlyRating } from '@/lib/performance/yearlyReports';
import { requirePermission } from '@/lib/rbac';
import { getCurrentUserInfo } from '@/lib/iam';
import { getCurrentUser } from '@/lib/currentUser';

export async function PUT(request, { params }) {
  const { error } = await requirePermission('performanceReports.yearly.manage');
  if (error) return error;

  const { studentId } = await params;
  const { academicSession, finalRating } = await request.json();
  if (!academicSession) return NextResponse.json({ error: 'academicSession is required.' }, { status: 400 });

  const currentUser = (await getCurrentUserInfo()) || (await getCurrentUser());
  try {
    const report = await setYearlyRating(currentUser, studentId, academicSession, finalRating);
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
