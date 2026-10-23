import { NextResponse } from 'next/server';
import { getDefaulterStudentIds } from '@/lib/fees';
import { requireStaffPermission } from '@/lib/rbac';

// GET /api/fees/defaulters — SendFeesReminderModal's "Defaulters" target
// group: every student with at least one term past its due date with money
// still owed on it (same definition as the dashboard's Overdue figure).
export async function GET() {
  const { error } = await requireStaffPermission('fees.view');
  if (error) return error;

  const studentIds = await getDefaulterStudentIds();
  return NextResponse.json({ studentIds });
}
