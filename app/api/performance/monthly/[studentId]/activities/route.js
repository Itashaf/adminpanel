import { NextResponse } from 'next/server';
import { addActivity } from '@/lib/performance/monthlyReports';
import { requirePermission } from '@/lib/rbac';
import { getCurrentUserInfo } from '@/lib/iam';
import { getCurrentUser } from '@/lib/currentUser';

export async function POST(request, { params }) {
  const { error } = await requirePermission('performanceReports.monthly.manage');
  if (error) return error;

  const { studentId } = await params;
  const { academicSession, month, activityName, achievement } = await request.json();
  if (!academicSession || !month) {
    return NextResponse.json({ error: 'academicSession and month are required.' }, { status: 400 });
  }

  const currentUser = (await getCurrentUserInfo()) || (await getCurrentUser());
  try {
    const activity = await addActivity(currentUser, studentId, academicSession, month, { activityName, achievement });
    return NextResponse.json(activity);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
