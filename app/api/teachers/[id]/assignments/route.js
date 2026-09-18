import { NextResponse } from 'next/server';
import { assignClassToTeacher, removeAssignmentFromTeacher } from '@/lib/teachers';
import { getClassSectionsMap } from '@/lib/classes';
import { requireSchoolAdmin } from '@/lib/iam';
import { resolveSchoolId } from '@/lib/auth/schoolContext';

export async function POST(request, { params }) {
  const { error: authError } = await requireSchoolAdmin();
  if (authError) return authError;

  const { id } = await params;
  const data = await request.json();

  // Section count is now per-school/admin-defined (see lib/classes.js's
  // getClassSectionsMap) — section is only actually required for a class
  // that currently has some real sections to pick from.
  const classSections = await getClassSectionsMap();
  const classHasSections = (classSections[data.class] || []).length > 0;
  if (!data.academicSession || !data.class || (classHasSections && !data.section)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const teacher = await assignClassToTeacher(id, data, await resolveSchoolId());
    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }
    return NextResponse.json(teacher);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 409 });
  }
}

export async function DELETE(request, { params }) {
  const { error: authError } = await requireSchoolAdmin();
  if (authError) return authError;

  const { id } = await params;
  const { assignmentId } = await request.json();

  if (!assignmentId) {
    return NextResponse.json({ error: 'Missing assignment id' }, { status: 400 });
  }

  const teacher = await removeAssignmentFromTeacher(id, assignmentId, await resolveSchoolId());
  if (!teacher) {
    return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
  }

  return NextResponse.json(teacher);
}
