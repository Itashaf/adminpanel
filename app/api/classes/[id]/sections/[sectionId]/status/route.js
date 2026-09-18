import { NextResponse } from 'next/server';
import { updateSectionStatus } from '@/lib/classes';
import { requireSchoolAdmin } from '@/lib/iam';

export async function PATCH(request, { params }) {
  const { error: authError } = await requireSchoolAdmin();
  if (authError) return authError;

  const { id, sectionId } = await params;
  const { status } = await request.json();

  if (!status) {
    return NextResponse.json({ error: 'Missing status' }, { status: 400 });
  }

  const section = await updateSectionStatus(id, sectionId, status);
  if (!section) {
    return NextResponse.json({ error: 'Section not found' }, { status: 404 });
  }

  return NextResponse.json({ id: section.id, status: section.status });
}
