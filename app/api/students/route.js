import { NextResponse } from 'next/server';
import { addStudent, getAllStudents } from '@/lib/students';
import { requireSchoolAdmin, getCurrentUserInfo } from '@/lib/iam';
import { isClassInTeacherScope, getTeacherClassScope } from '@/lib/roleGuard';
import { resolveSchoolId } from '@/lib/auth/schoolContext';

export async function GET() {
  const actor = await getCurrentUserInfo();
  if (!actor) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const students = await getAllStudents(await resolveSchoolId());

  if (actor.role === 'SchoolAdmin' || actor.role === 'SuperAdmin') {
    return NextResponse.json(students);
  }

  if (actor.role === 'Teacher') {
    // A Class Teacher with no subject assignment of their own (only
    // Section.classTeacherId) still owns their homeroom's roster —
    // assignedClasses alone wrongly showed them zero students.
    const scoped = students.filter((s) =>
      isClassInTeacherScope(getTeacherClassScope(actor), s.academicSession, s.class, s.section)
    );
    // Teacher only gets roster-relevant fields — guardian/fee/address/aadhaar
    // stay admin-only.
    const safe = scoped.map((s) => ({
      id: s.id,
      admissionId: s.admissionId,
      firstName: s.firstName,
      lastName: s.lastName,
      initials: s.initials,
      class: s.class,
      section: s.section,
      academicSession: s.academicSession,
      status: s.status,
    }));
    return NextResponse.json(safe);
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function POST(request) {
  const { error: authError } = await requireSchoolAdmin();
  if (authError) return authError;

  const data = await request.json();

  if (!data.firstName || !data.lastName || !data.admissionNumber) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const student = await addStudent(data, await resolveSchoolId());
    return NextResponse.json({ id: student.id, admissionId: student.admissionId });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
