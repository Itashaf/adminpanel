import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/rbac';
import { setUserPassword } from '@/lib/userPasswords';
import { readJson } from '@/lib/http';

// PUT /api/users/[id]/password — { password }. Super Admin only: sets a new password for any login
// (also in the Teacher / Parent / School Admin tables that sign-in actually checks).
export async function PUT(request, { params }) {
  const { user, error } = await requirePermission('users.update');
  if (error) return error;
  if (user.roleKey !== 'SuperAdmin') {
    return NextResponse.json({ error: 'Only the Super Admin can set another user\'s password.' }, { status: 403 });
  }

  const { id } = await params;
  const { password } = await readJson(request);
  try {
    const result = await setUserPassword(id, password);
    if (!result) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
