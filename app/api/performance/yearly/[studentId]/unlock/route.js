import { NextResponse } from 'next/server';
import { unlockYearlyReport } from '@/lib/performance/yearlyReports';
import { requirePermission } from '@/lib/rbac';

// Admin/Principal/SuperAdmin only — same shared-permission-key pattern as
// Monthly unlock.
export async function POST(request, { params }) {
  const { user: actor, error } = await requirePermission('performanceReports.yearly.manage');
  if (error) return error;
  if (actor.roleKey === 'Teacher') {
    return NextResponse.json({ error: 'Only an Admin or Principal can unlock a report.' }, { status: 403 });
  }

  const { studentId } = await params;
  const { academicSession } = await request.json();
  if (!academicSession) return NextResponse.json({ error: 'academicSession is required.' }, { status: 400 });

  const actorId = actor.id || actor.legacyId;
  try {
    const report = await unlockYearlyReport(studentId, academicSession, actorId);
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
