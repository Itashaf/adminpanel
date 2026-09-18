import { NextResponse } from 'next/server';
import { assignClassTeacher } from '@/lib/classes';
import { requireSchoolAdmin } from '@/lib/iam';

// For a class with no sections (Nursery/Playway) — assigns/unassigns the
// class teacher directly on the class, without ever requiring a Section to
// exist first. See lib/classes.js's assignClassTeacher.
export async function PATCH(request, { params }) {
  const { error: authError } = await requireSchoolAdmin();
  if (authError) return authError;

  const { id } = await params;
  const { classTeacherId } = await request.json();

  try {
    const section = await assignClassTeacher(id, classTeacherId);
    if (!section) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }
    return NextResponse.json({ classTeacherId: section.classTeacherId, classTeacherName: section.classTeacherName });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 409 });
  }
}
