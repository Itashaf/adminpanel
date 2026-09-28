import { NextResponse } from 'next/server';
import { listTimeTables } from '@/lib/timetable';
import { requirePermission } from '@/lib/rbac';

// Every class's timetable, cross-class — stays admin-only even though
// Teacher also holds timetable.manage (for their own class only, see
// app/api/timetable/route.js's assertCanManageTimetable). Same
// shared-permission-key pattern as Students/staff-attendance: explicit
// Teacher-block on top of the permission check, not the permission alone.
export async function GET(request) {
  const { user, error: authError } = await requirePermission('timetable.manage');
  if (authError) return authError;
  if (user.roleKey === 'Teacher') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const academicSession = searchParams.get('academicSession');
  if (!academicSession) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const rows = await listTimeTables(academicSession);
  return NextResponse.json(rows);
}
