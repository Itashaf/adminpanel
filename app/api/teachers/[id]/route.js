import { NextResponse } from 'next/server';
import { getTeacherById, updateTeacher } from '@/lib/teachers';
import { requirePermission } from '@/lib/rbac';
import { resolveSchoolId } from '@/lib/auth/schoolContext';
import { readJson } from '@/lib/http';

// GET /api/teachers/:id — the full record the web Edit Teacher page
// (app/dashboard/teachers/[id]/edit) hands to EditTeacherForm, for the mobile
// edit form. PUT below replaces the whole record, so an editor needs every
// field back or a save would wipe bank/Aadhaar/document data. Gated on the
// same teachers.update key as the PUT; decorateTeacher never includes the
// password hash.
export async function GET(request, { params }) {
  const { error } = await requirePermission('teachers.update');
  if (error) return error;

  const { id } = await params;
  const teacher = await getTeacherById(id, await resolveSchoolId());
  if (!teacher) return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
  return NextResponse.json({ teacher });
}

export async function PUT(request, { params }) {
  const { error } = await requirePermission('teachers.update');
  if (error) return error;

  const { id } = await params;
  const data = await readJson(request);

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
