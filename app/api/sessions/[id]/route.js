import { NextResponse } from 'next/server';
import { updateSession } from '@/lib/academicSessions';

export async function PUT(request, { params }) {
  const { id } = await params;
  const data = await request.json();

  if (!data.startDate || !data.endDate) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const session = await updateSession(id, data);
    if (!session) {
      return NextResponse.json({ error: 'Academic session not found' }, { status: 404 });
    }
    return NextResponse.json(session);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
