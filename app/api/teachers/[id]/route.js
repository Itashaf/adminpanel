import { NextResponse } from 'next/server';
import { updateTeacher } from '@/lib/teachers';
import { requireSchoolAdmin } from '@/lib/iam';
import { resolveSchoolId } from '@/lib/auth/schoolContext';

export async function PUT(request, { params }) {
  const { error } = await requireSchoolAdmin();
  if (error) return error;

  const { id } = await params;
  const data = await request.json();

  if (!data.firstName || !data.lastName || !data.employeeId || !data.email || !data.dob || !data.gender || !data.joiningDate) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const teacher = await updateTeacher(id, data, await resolveSchoolId());
    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }
    return NextResponse.json({ id: teacher.id, employeeId: teacher.employeeId });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
