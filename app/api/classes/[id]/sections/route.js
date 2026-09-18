import { NextResponse } from 'next/server';
import { addSection } from '@/lib/classes';
import { requireSchoolAdmin } from '@/lib/iam';

export async function POST(request, { params }) {
  const { error: authError } = await requireSchoolAdmin();
  if (authError) return authError;

  const { id } = await params;
  const data = await request.json();

  if (!data.name || !data.capacity) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const section = await addSection(id, data);
    return NextResponse.json(section);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
