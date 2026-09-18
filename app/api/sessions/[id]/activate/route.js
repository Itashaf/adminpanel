import { NextResponse } from 'next/server';
import { setActiveSession } from '@/lib/academicSessions';

export async function PATCH(request, { params }) {
  const { id } = await params;

  const session = await setActiveSession(id);
  if (!session) {
    return NextResponse.json({ error: 'Academic session not found' }, { status: 404 });
  }

  return NextResponse.json(session);
}
