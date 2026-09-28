import { NextResponse } from 'next/server';
import { lockMonthlyReport } from '@/lib/performance/monthlyReports';
import { requirePermission } from '@/lib/rbac';
import { getCurrentUserInfo } from '@/lib/iam';
import { getCurrentUser } from '@/lib/currentUser';

export async function POST(request, { params }) {
  const { user: actor, error } = await requirePermission('performanceReports.monthly.manage');
  if (error) return error;

  const { studentId } = await params;
  const { academicSession, month } = await request.json();
  if (!academicSession || !month) {
    return NextResponse.json({ error: 'academicSession and month are required.' }, { status: 400 });
  }

  const currentUser = (await getCurrentUserInfo()) || (await getCurrentUser());
  const actorId = actor.id || actor.legacyId;
  try {
    const report = await lockMonthlyReport(currentUser, studentId, academicSession, month, actorId);
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
