import { NextResponse } from 'next/server';
import { requireParent } from '@/lib/iam';
import { markNotificationRead } from '@/lib/parentNotifications';

export async function POST(request, { params }) {
  const { actor, error } = await requireParent();
  if (error) return error;

  const { id } = await params;
  const ok = await markNotificationRead(id, actor.studentId, actor.schoolId);
  if (!ok) return NextResponse.json({ error: 'Notification not found' }, { status: 404 });

  return NextResponse.json({ success: true });
}
