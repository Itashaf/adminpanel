import { NextResponse } from 'next/server';
import { sendFeeReminders } from '@/lib/fees';
import { getCurrentUserInfo } from '@/lib/iam';
import { requirePermission } from '@/lib/rbac';

// POST /api/fees/send-reminder — { studentIds: string[] } (one or many).
// Sends a real in-app Notice (Individual/Parent audience, same path/push
// delivery createNotice already uses) per parent linked to a student with
// an actual pending balance — the due amount is always recomputed
// server-side from real StudentFee rows, never trusted from the request
// body, so a client can't spoof the reminder amount. Gated on
// notices.create since that's the actual write this performs; same
// permission app/api/notices/route.js's own POST already requires.
export async function POST(request) {
  const { error: permError } = await requirePermission('notices.create');
  if (permError) return permError;

  const currentUser = await getCurrentUserInfo();
  if (!currentUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { studentIds } = await request.json();
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return NextResponse.json({ error: 'studentIds must be a non-empty array' }, { status: 400 });
  }

  try {
    const result = await sendFeeReminders(studentIds, currentUser);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
