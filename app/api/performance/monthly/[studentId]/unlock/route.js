import { NextResponse } from 'next/server';
import { unlockMonthlyReport } from '@/lib/performance/monthlyReports';
import { requirePermission } from '@/lib/rbac';

// Admin/Principal/SuperAdmin only — a Class Teacher holds the same
// performanceReports.monthly.manage key (they need it to lock in the first
// place) but must never be able to undo their own lock unsupervised. Same
// shared-permission-key pattern as attendance lock/unlock elsewhere in
// this app: permission check first, then an explicit role check on top.
export async function POST(request, { params }) {
  const { user: actor, error } = await requirePermission('performanceReports.monthly.manage');
  if (error) return error;
  if (actor.roleKey === 'Teacher') {
    return NextResponse.json({ error: 'Only an Admin or Principal can unlock a report.' }, { status: 403 });
  }

  const { studentId } = await params;
  const { academicSession, month } = await request.json();
  if (!academicSession || !month) {
    return NextResponse.json({ error: 'academicSession and month are required.' }, { status: 400 });
  }

  const actorId = actor.id || actor.legacyId;
  try {
    const report = await unlockMonthlyReport(studentId, academicSession, month, actorId);
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
