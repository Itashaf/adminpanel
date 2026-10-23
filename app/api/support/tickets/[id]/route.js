import { NextResponse } from 'next/server';
import { getCurrentUserInfo } from '@/lib/iam';
import { getTicketWithReplies, markTicketSeen } from '@/lib/support';
import { markAdminNotificationsBySourceRead } from '@/lib/adminNotifications';

export async function GET(request, { params }) {
  const actor = await getCurrentUserInfo();
  if (!actor) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (actor.role === 'Parent') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  // A staff actor with no school would make the school-scoped queries below run
  // unscoped (a missing schoolId means "no filter"), so refuse instead.
  if (actor.role !== 'SuperAdmin' && !actor.schoolId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const isSuperAdmin = actor.role === 'SuperAdmin';
  const ticket = await getTicketWithReplies(id, isSuperAdmin ? null : actor.schoolId);
  if (!ticket) return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 });

  // Actually opening a ticket's thread is what marks it seen — not just
  // appearing in the list (see lib/support.js's markTicketSeen).
  await markTicketSeen(id, isSuperAdmin ? 'superadmin' : 'school');

  // Also clears every Notification Bell entry this ticket generated (one
  // per SuperAdmin reply/status change) in one go — AdminNotification rows
  // only ever go to the school side (see lib/support.js's addReply), so
  // this is a no-op for a SuperAdmin viewer.
  if (!isSuperAdmin) {
    await markAdminNotificationsBySourceRead(actor.schoolId, id);
  }

  return NextResponse.json({ ticket });
}
