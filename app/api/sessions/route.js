import { NextResponse } from 'next/server';
import { addSession } from '@/lib/academicSessions';
import { requireSchoolAdmin } from '@/lib/iam';

export async function POST(request) {
  const { error: authError } = await requireSchoolAdmin();
  if (authError) return authError;

  const data = await request.json();

  if (!data.startDate || !data.endDate) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const session = await addSession(data);
    return NextResponse.json(session);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
