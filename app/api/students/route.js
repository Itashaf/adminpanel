import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { addStudent, getAllStudents } from '@/lib/students';
import { requireSchoolAdmin, getCurrentUserInfo } from '@/lib/iam';
import { isClassInTeacherScope, getTeacherClassScope } from '@/lib/roleGuard';
import { resolveSchoolId } from '@/lib/auth/schoolContext';

// Teacher's roster-relevant fields only — guardian/fee/address/aadhaar/
// documents/previousSchool (6 Json blobs on the full Student shape) stay
// admin-only. Selected at the query itself, not fetched-then-discarded: a
// Teacher's own request used to pay for every one of those blobs, for
// every student in the WHOLE school, before this route ever stripped them
// down to these 9 fields.
const TEACHER_STUDENT_SELECT = {
  id: true,
  admissionId: true,
  firstName: true,
  lastName: true,
  initials: true,
  class: true,
  section: true,
  academicSession: true,
  status: true,
};

export async function GET() {
  const actor = await getCurrentUserInfo();
  if (!actor) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  if (actor.role === 'SchoolAdmin' || actor.role === 'SuperAdmin') {
    const students = await getAllStudents(await resolveSchoolId());
    return NextResponse.json(students);
  }

  if (actor.role === 'Teacher') {
    // A Class Teacher with no subject assignment of their own (only
    // Section.classTeacherId) still owns their homeroom's roster —
    // assignedClasses alone wrongly showed them zero students. The scope
    // check itself (isClassInTeacherScope) still runs in JS per row — it's
    // not a single Prisma `where` shape — but the query no longer pays for
    // the 6 Json blobs neither this filter nor a Teacher's own response
    // ever reads.
    const schoolId = await resolveSchoolId();
    const rows = await prisma.student.findMany({ where: { schoolId }, select: TEACHER_STUDENT_SELECT });
    const safe = rows.filter((s) =>
      isClassInTeacherScope(getTeacherClassScope(actor), s.academicSession, s.class, s.section)
    );
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
