import { NextResponse } from 'next/server';
import { linkOrCreateParentAccount, getParentAccountForStudent, unlinkStudentFromParent } from '@/lib/parentAccounts';
import { requireSchoolAdmin } from '@/lib/iam';
import { resolveSchoolId } from '@/lib/auth/schoolContext';

export async function GET(request, { params }) {
  const { error } = await requireSchoolAdmin();
  if (error) return error;

  const { id } = await params;
  const account = await getParentAccountForStudent(id, await resolveSchoolId());
  return NextResponse.json(account);
}

export async function POST(request, { params }) {
  const { error } = await requireSchoolAdmin();
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
  const { error } = await requireSchoolAdmin();
  if (error) return error;

  const { id } = await params;
  const removed = await unlinkStudentFromParent(id, await resolveSchoolId());
  if (!removed) {
    return NextResponse.json({ error: 'No linked parent account found.' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
