import { NextResponse } from 'next/server';
import { getStudentById, updateStudent, deleteStudent } from '@/lib/students';
import { requirePermission } from '@/lib/rbac';
import { resolveSchoolId } from '@/lib/auth/schoolContext';

export async function GET(request, { params }) {
  const { user, error } = await requirePermission('students.view');
  if (error) return error;

  // students.view is legitimately held by Teacher too (for the field-
  // stripped roster routes — GET /api/students, /paged, /print-details),
  // but getStudentById() below returns the FULL admin record, including
  // guardian/fee/address/aadhaar/documents — fields those other routes
  // deliberately never send a Teacher. A flat permission check alone would
  // reopen that leak; this route stays admin-tier only regardless of who
  // else holds students.view.
  if (user.roleKey === 'Teacher') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const student = await getStudentById(id, await resolveSchoolId());
  if (!student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }
  return NextResponse.json(student);
}

export async function PUT(request, { params }) {
  const { error: authError } = await requirePermission('students.update');
  if (authError) return authError;

  const { id } = await params;
  const data = await request.json();

  if (!data.firstName || !data.lastName || !data.admissionNumber) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const student = await updateStudent(id, data, await resolveSchoolId());
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    return NextResponse.json({ id: student.id, admissionId: student.admissionId });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { error: authError } = await requirePermission('students.delete');
  if (authError) return authError;

  const { id } = await params;
  try {
    const removed = await deleteStudent(id, await resolveSchoolId());
    if (!removed) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    return NextResponse.json({ removed: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
