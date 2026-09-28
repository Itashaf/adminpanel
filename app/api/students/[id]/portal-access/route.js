import { NextResponse } from 'next/server';
import { linkOrCreateParentAccount, getParentAccountForStudent, unlinkStudentFromParent } from '@/lib/parentAccounts';
import { requirePermission } from '@/lib/rbac';
import { resolveSchoolId } from '@/lib/auth/schoolContext';

export async function GET(request, { params }) {
  const { user, error } = await requirePermission('students.view');
  if (error) return error;

  // Same reasoning as GET /api/students/[id] — students.view is shared with
  // Teacher for the field-stripped roster routes, but a parent account's own
  // login email is admin-only account-management info, not roster data.
  if (user.roleKey === 'Teacher') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const account = await getParentAccountForStudent(id, await resolveSchoolId());
  return NextResponse.json(account);
}

export async function POST(request, { params }) {
  const { error } = await requirePermission('students.update');
  if (error) return error;

  const { id } = await params;
  try {
    const data = await request.json();
    const result = await linkOrCreateParentAccount(id, data, await resolveSchoolId());
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { error } = await requirePermission('students.update');
  if (error) return error;

  const { id } = await params;
  const removed = await unlinkStudentFromParent(id, await resolveSchoolId());
  if (!removed) {
    return NextResponse.json({ error: 'No linked parent account found.' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
