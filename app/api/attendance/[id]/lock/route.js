import { NextResponse } from 'next/server';
import { setAttendanceLock, getAttendanceRecordById } from '@/lib/attendance';
import { requirePermission } from '@/lib/rbac';

export async function PATCH(request, { params }) {
  const { id } = await params;
  const { unlocked } = await request.json();

  // attendance.student.update — Teacher's default permission set has
  // .view/.mark/.report but not .update, so this is a straight 1:1
  // replacement for the old "Teacher always 403, everyone else through"
  // check, closing the same gap that check had (any non-Teacher role used
  // to pass unconditionally, permission or not).
  const { error: permError } = await requirePermission('attendance.student.update');
  if (permError) return permError;

  const existing = await getAttendanceRecordById(id);
  if (!existing) {
    return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
  }

  const record = await setAttendanceLock(id, Boolean(unlocked));
  return NextResponse.json(record);
}
