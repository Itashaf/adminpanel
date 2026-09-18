import { NextResponse } from 'next/server';
import { requireParent } from '@/lib/iam';
import { changeParentSelfPassword } from '@/lib/parentAccounts';

export async function POST(request) {
  const { actor, error } = await requireParent();
  if (error) return error;

  const { currentPassword, newPassword } = await request.json();
  try {
    await changeParentSelfPassword(actor.id, actor.schoolId, currentPassword, newPassword);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Could not change password.' }, { status: 400 });
  }
}
