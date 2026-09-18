import { NextResponse } from 'next/server';
import { requireTeacher } from '@/lib/iam';
import { resolveSchoolId } from '@/lib/auth/schoolContext';
import {
  getNotificationsForTeacher,
  getUnreadNotificationCount,
  getTotalNotificationCount,
} from '@/lib/teacherNotifications';

export async function GET(request) {
  const { actor, error } = await requireTeacher();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const schoolId = await resolveSchoolId();
  const [{ notifications, hasMore }, unreadCount, totalCount] = await Promise.all([
    getNotificationsForTeacher(actor.teacherId, schoolId, { page }),
    getUnreadNotificationCount(actor.teacherId, schoolId),
    getTotalNotificationCount(actor.teacherId, schoolId),
  ]);

  return NextResponse.json({ notifications, hasMore, page, unreadCount, totalCount });
}
