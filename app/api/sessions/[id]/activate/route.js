import { NextResponse } from 'next/server';
import { setActiveSession } from '@/lib/academicSessions';
import { requireSchoolAdmin } from '@/lib/iam';

export async function PATCH(request, { params }) {
  const { error: authError } = await requireSchoolAdmin();
  if (authError) return authError;

  const { id } = await params;

  const session = await setActiveSession(id);
  if (!session) {
    return NextResponse.json({ error: 'Academic session not found' }, { status: 404 });
  }

  return NextResponse.json(session);
}
