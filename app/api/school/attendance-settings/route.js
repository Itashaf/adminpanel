import { NextResponse } from 'next/server';
import { updateAttendanceSettings } from '@/lib/schoolSettings';
import { requirePermission } from '@/lib/rbac';

export async function PUT(request) {
  const { error: authError } = await requirePermission('settings.update');
  if (authError) return authError;

  const data = await request.json();

  if (!data.attendanceDeadlineTime || !data.attendanceEditGraceMinutes) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const school = await updateAttendanceSettings(data);
  return NextResponse.json(school);
}
