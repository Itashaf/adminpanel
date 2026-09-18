import { NextResponse } from 'next/server';
import { resetTeacherPassword } from '@/lib/teachers';
import { requireSchoolAdmin } from '@/lib/iam';
import { resolveSchoolId } from '@/lib/auth/schoolContext';

export async function POST(request, { params }) {
  const { error } = await requireSchoolAdmin();
  if (error) return error;

  const { id } = await params;

  const result = await resetTeacherPassword(id, await resolveSchoolId());
  if (!result) {
    return NextResponse.json({ error: 'Teacher not found, or has no login access to reset.' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
