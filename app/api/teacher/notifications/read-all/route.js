import { NextResponse } from 'next/server';
import { requireTeacher } from '@/lib/iam';
import { resolveSchoolId } from '@/lib/auth/schoolContext';
import { markAllNotificationsRead } from '@/lib/teacherNotifications';

export async function POST() {
  const { actor, error } = await requireTeacher();
  if (error) return error;

  const schoolId = await resolveSchoolId();
  const count = await markAllNotificationsRead(actor.teacherId, schoolId);
  return NextResponse.json({ success: true, count });
}
