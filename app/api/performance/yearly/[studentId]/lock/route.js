import { NextResponse } from 'next/server';
import { lockYearlyReport } from '@/lib/performance/yearlyReports';
import { requirePermission } from '@/lib/rbac';
import { getCurrentUserInfo } from '@/lib/iam';
import { getCurrentUser } from '@/lib/currentUser';

export async function POST(request, { params }) {
  const { user: actor, error } = await requirePermission('performanceReports.yearly.manage');
  if (error) return error;

  const { studentId } = await params;
  const { academicSession } = await request.json();
  if (!academicSession) return NextResponse.json({ error: 'academicSession is required.' }, { status: 400 });

  const currentUser = (await getCurrentUserInfo()) || (await getCurrentUser());
  const actorId = actor.id || actor.legacyId;
  try {
    const report = await lockYearlyReport(currentUser, studentId, academicSession, actorId);
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
