import { NextResponse } from 'next/server';
import { updateTeacherStatus } from '@/lib/teachers';
import { requirePermission } from '@/lib/rbac';
import { resolveSchoolId } from '@/lib/auth/schoolContext';

export async function PATCH(request, { params }) {
  const { error } = await requirePermission('teachers.update');
  if (error) return error;

  const { id } = await params;
  const { status } = await request.json();

  if (!status) {
    return NextResponse.json({ error: 'Missing status' }, { status: 400 });
  }

  const teacher = await updateTeacherStatus(id, status, await resolveSchoolId());
  if (!teacher) {
    return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
  }

  return NextResponse.json({ id: teacher.id, status: teacher.status });
}
