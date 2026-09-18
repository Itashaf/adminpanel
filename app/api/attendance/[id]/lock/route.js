import { NextResponse } from 'next/server';
import { setAttendanceLock, getAttendanceRecordById } from '@/lib/attendance';
import { getCurrentUser } from '@/lib/currentUser';

export async function PATCH(request, { params }) {
  const { id } = await params;
  const { unlocked } = await request.json();

  const currentUser = await getCurrentUser();
  if (currentUser.role === 'Teacher') {
    return NextResponse.json({ error: 'Only an admin can lock or unlock attendance.' }, { status: 403 });
  }

  const existing = await getAttendanceRecordById(id);
  if (!existing) {
    return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
  }

  const record = await setAttendanceLock(id, Boolean(unlocked));
  return NextResponse.json(record);
}
