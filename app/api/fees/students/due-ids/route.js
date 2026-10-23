import { NextResponse } from 'next/server';
import { getStudentIdsWithDue } from '@/lib/fees';
import { requireStaffPermission } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

// GET /api/fees/students/due-ids?class=&section= — SendFeesReminderModal's
// "All pending fees" / "A specific class" target groups: the ids of every
// Active student with money still owed (optionally one class/section), same
// permission + Parent block as the Student Fees table's own summary route.
export async function GET(request) {
  const { user, error } = await requireStaffPermission('fees.view');
  if (error) return error;
  if (user.roleKey === 'Parent') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const studentIds = await getStudentIdsWithDue({
    className: searchParams.get('class') || '',
    section: searchParams.get('section') || '',
  });
  return NextResponse.json({ studentIds });
}
