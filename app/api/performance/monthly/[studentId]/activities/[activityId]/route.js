import { NextResponse } from 'next/server';
import { removeActivity } from '@/lib/performance/monthlyReports';
import { requirePermission } from '@/lib/rbac';
import { getCurrentUserInfo } from '@/lib/iam';
import { getCurrentUser } from '@/lib/currentUser';

export async function DELETE(request, { params }) {
  const { error } = await requirePermission('performanceReports.monthly.manage');
  if (error) return error;

  const { studentId, activityId } = await params;
  const { searchParams } = new URL(request.url);
  const academicSession = searchParams.get('academicSession');
  const month = searchParams.get('month');
  if (!academicSession || !month) {
    return NextResponse.json({ error: 'academicSession and month are required.' }, { status: 400 });
  }

  const currentUser = (await getCurrentUserInfo()) || (await getCurrentUser());
  try {
    await removeActivity(currentUser, studentId, academicSession, month, activityId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
