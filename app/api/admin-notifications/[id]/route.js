import { NextResponse } from 'next/server';
import { requireSchoolAdmin } from '@/lib/iam';
import { markAdminNotificationRead } from '@/lib/adminNotifications';
import { resolveSchoolId } from '@/lib/auth/schoolContext';

export async function PATCH(request, { params }) {
  const { error } = await requireSchoolAdmin();
  if (error) return error;

  const { id } = await params;
  const ok = await markAdminNotificationRead(id, await resolveSchoolId());
  if (!ok) {
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
