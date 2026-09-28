import { NextResponse } from 'next/server';
import { setRemarks } from '@/lib/performance/monthlyReports';
import { requirePermission } from '@/lib/rbac';
import { getCurrentUserInfo } from '@/lib/iam';
import { getCurrentUser } from '@/lib/currentUser';

export async function PUT(request, { params }) {
  const { error } = await requirePermission('performanceReports.monthly.manage');
  if (error) return error;

  const { studentId } = await params;
  const { academicSession, month, strengthChips, improvementChips, remarkText } = await request.json();
  if (!academicSession || !month) {
    return NextResponse.json({ error: 'academicSession and month are required.' }, { status: 400 });
  }

  const currentUser = (await getCurrentUserInfo()) || (await getCurrentUser());
  try {
    const remarks = await setRemarks(currentUser, studentId, academicSession, month, { strengthChips, improvementChips, remarkText });
    return NextResponse.json(remarks);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
