import { NextResponse } from 'next/server';
import { setHolistic } from '@/lib/performance/monthlyReports';
import { requirePermission } from '@/lib/rbac';
import { getCurrentUserInfo } from '@/lib/iam';
import { getCurrentUser } from '@/lib/currentUser';

export async function PUT(request, { params }) {
  const { error } = await requirePermission('performanceReports.monthly.manage');
  if (error) return error;

  const { studentId } = await params;
  const { academicSession, month, discipline, homeworkCompletion, englishCommunication, punctuality, hygiene } = await request.json();
  if (!academicSession || !month) {
    return NextResponse.json({ error: 'academicSession and month are required.' }, { status: 400 });
  }

  const currentUser = (await getCurrentUserInfo()) || (await getCurrentUser());
  try {
    const holistic = await setHolistic(currentUser, studentId, academicSession, month, {
      discipline, homeworkCompletion, englishCommunication, punctuality, hygiene,
    });
    return NextResponse.json(holistic);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
