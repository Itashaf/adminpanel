import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/rbac';
import { sendUserResetLink } from '@/lib/userPasswords';

// POST /api/users/[id]/reset-link — emails the user a single-use link to choose a new password.
// Super Admin only.
export async function POST(request, { params }) {
  const { user, error } = await requirePermission('users.update');
  if (error) return error;
  if (user.roleKey !== 'SuperAdmin') {
    return NextResponse.json({ error: 'Only the Super Admin can send a reset link.' }, { status: 403 });
  }

  const { id } = await params;
  try {
    const result = await sendUserResetLink(id);
    if (!result) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json({ success: true, email: result.email });
  } catch (err) {
    console.error('send reset link failed', err);
    return NextResponse.json({ error: 'Could not send the email. Check the mail settings and try again.' }, { status: 502 });
  }
}
