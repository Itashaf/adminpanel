import { NextResponse } from 'next/server';
import { requireTeacher } from '@/lib/iam';
import { resolveSchoolId } from '@/lib/auth/schoolContext';
import { markNotificationRead } from '@/lib/teacherNotifications';

export async function POST(request, { params }) {
  const { actor, error } = await requireTeacher();
  if (error) return error;

  const schoolId = await resolveSchoolId();
  const { id } = await params;
  const ok = await markNotificationRead(id, actor.teacherId, schoolId);
  if (!ok) return NextResponse.json({ error: 'Notification not found' }, { status: 404 });

  return NextResponse.json({ success: true });
}
