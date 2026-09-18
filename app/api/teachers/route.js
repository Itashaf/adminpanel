import { NextResponse } from 'next/server';
import { addTeacher } from '@/lib/teachers';
import { requireSchoolAdmin } from '@/lib/iam';
import { resolveSchoolId } from '@/lib/auth/schoolContext';

export async function POST(request) {
  const { error } = await requireSchoolAdmin();
  if (error) return error;

  const data = await request.json();

  if (!data.firstName || !data.lastName || !data.employeeId || !data.email || !data.dob || !data.gender || !data.joiningDate) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const teacher = await addTeacher(data, await resolveSchoolId());
    return NextResponse.json({
      id: teacher.id,
      employeeId: teacher.employeeId,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      loginInviteSent: teacher.loginAccess.enabled,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
