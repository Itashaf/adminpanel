import { NextResponse } from 'next/server';
import { requireParent } from '@/lib/iam';
import { markAllNotificationsRead } from '@/lib/parentNotifications';

export async function POST() {
  const { actor, error } = await requireParent();
  if (error) return error;

  const count = await markAllNotificationsRead(actor.studentId, actor.schoolId);
  return NextResponse.json({ success: true, count });
}
