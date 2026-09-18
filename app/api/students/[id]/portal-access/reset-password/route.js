import { NextResponse } from 'next/server';
import { resetParentAccountPassword } from '@/lib/parentAccounts';
import { requireSchoolAdmin } from '@/lib/iam';
import { resolveSchoolId } from '@/lib/auth/schoolContext';

export async function POST(request, { params }) {
  const { error } = await requireSchoolAdmin();
  if (error) return error;

  const { id } = await params;
  try {
    const result = await resetParentAccountPassword(id, await resolveSchoolId());
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
