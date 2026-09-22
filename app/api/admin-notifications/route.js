import { NextResponse } from 'next/server';
import { requireSchoolAdmin } from '@/lib/iam';
import { getAdminNotifications, getUnreadAdminNotificationCount, markAllAdminNotificationsRead } from '@/lib/adminNotifications';
import { resolveSchoolId } from '@/lib/auth/schoolContext';

export async function GET() {
  const { error } = await requireSchoolAdmin();
  if (error) return error;

  const schoolId = await resolveSchoolId();
  const [notifications, unreadCount] = await Promise.all([
    getAdminNotifications(schoolId),
    getUnreadAdminNotificationCount(schoolId),
  ]);
  return NextResponse.json({ notifications, unreadCount });
}

// PATCH /api/admin-notifications — mark every notification read (the bell
// dropdown's "Mark all read"). A single one is PATCH /api/admin-notifications/[id].
export async function PATCH() {
  const { error } = await requireSchoolAdmin();
  if (error) return error;

  const schoolId = await resolveSchoolId();
  await markAllAdminNotificationsRead(schoolId);
  return NextResponse.json({ success: true });
}
