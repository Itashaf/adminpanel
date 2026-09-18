import { NextResponse } from 'next/server';
import { assignSectionTeacher } from '@/lib/classes';
import { requireSchoolAdmin } from '@/lib/iam';

export async function PATCH(request, { params }) {
  const { error: authError } = await requireSchoolAdmin();
  if (authError) return authError;

  const { id, sectionId } = await params;
  const { classTeacherId } = await request.json();

  try {
    const section = await assignSectionTeacher(id, sectionId, classTeacherId);
    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }
    return NextResponse.json({ id: section.id, classTeacherId: section.classTeacherId });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 409 });
  }
}
