import { NextResponse } from 'next/server';
import { setAttendanceLock, getAttendanceRecordById } from '@/lib/attendance';
import { getCurrentUser } from '@/lib/currentUser';
import { getCurrentUserInfo } from '@/lib/iam';

export async function PATCH(request, { params }) {
  const { id } = await params;
  const { unlocked } = await request.json();

  // A real signed-in session must win over lib/currentUser.js's process-wide
  // demo toggle — same fix as every sibling attendance route (route.js,
  // report/route.js, roster/route.js) already has; this one was the outlier
  // that skipped it, meaning a Teacher's real identity was irrelevant here —
  // whoever last flipped the shared toggle on the server determined the
  // role check for every concurrent request.
  const currentUser = (await getCurrentUserInfo()) || (await getCurrentUser());
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
