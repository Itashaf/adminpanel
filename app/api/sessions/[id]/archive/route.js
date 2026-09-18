import { NextResponse } from 'next/server';
import { archiveSession } from '@/lib/academicSessions';

export async function PATCH(request, { params }) {
  const { id } = await params;

  try {
    const session = await archiveSession(id);
    if (!session) {
      return NextResponse.json({ error: 'Academic session not found' }, { status: 404 });
    }
    return NextResponse.json(session);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
