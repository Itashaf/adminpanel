import { NextResponse } from 'next/server';
import { addClass } from '@/lib/classes';
import { requireSchoolAdmin } from '@/lib/iam';

export async function POST(request) {
  const { error: authError } = await requireSchoolAdmin();
  if (authError) return authError;

  const data = await request.json();

  if (!data.level || !data.academicSession) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const cls = await addClass(data);
    return NextResponse.json(cls);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
