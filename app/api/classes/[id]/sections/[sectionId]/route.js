import { NextResponse } from 'next/server';
import { updateSection } from '@/lib/classes';
import { requireSchoolAdmin } from '@/lib/iam';

export async function PUT(request, { params }) {
  const { error: authError } = await requireSchoolAdmin();
  if (authError) return authError;

  const { id, sectionId } = await params;
  const data = await request.json();

  if (!data.name || !data.capacity) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const section = await updateSection(id, sectionId, data);
    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }
    return NextResponse.json(section);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
