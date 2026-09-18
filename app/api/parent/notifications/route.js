import { NextResponse } from 'next/server';
import { requireParent } from '@/lib/iam';
import { getNotificationsForStudent, getUnreadNotificationCount, getTotalNotificationCount } from '@/lib/parentNotifications';

export async function GET(request) {
  const { actor, error } = await requireParent();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const [{ notifications, hasMore }, unreadCount, totalCount] = await Promise.all([
    getNotificationsForStudent(actor.studentId, actor.schoolId, { page }),
    getUnreadNotificationCount(actor.studentId, actor.schoolId),
    getTotalNotificationCount(actor.studentId, actor.schoolId),
  ]);

  return NextResponse.json({ notifications, hasMore, page, unreadCount, totalCount });
}
