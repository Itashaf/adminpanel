import { NextResponse } from 'next/server';
import { getStudentById, getStudentClassInfo, toAppProfile } from '@/lib/students';
import { getCurrentUserInfo } from '@/lib/iam';
import { isAdminTier, isStudentInTeacherScope } from '@/lib/roleGuard';
import { resolveSchoolId } from '@/lib/auth/schoolContext';

// GET /api/students/[id]/profile — the student profile shown in the mobile app. A Teacher gets it
// only for a student of a class they are the Class Teacher of (same rule as the web profile page);
// anyone else gets the same 404 as a missing student. Contact and placement details only, see
// toAppProfile.
export async function GET(request, { params }) {
  const actor = await getCurrentUserInfo();
  if (!actor) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (actor.role !== 'Teacher' && !isAdminTier(actor)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const schoolId = await resolveSchoolId();
  const student = await getStudentById(id, schoolId);
  if (!student || (actor.role === 'Teacher' && !isStudentInTeacherScope(student, actor.classTeacherOf || []))) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  const classInfo = await getStudentClassInfo(student, schoolId);
  return NextResponse.json({ ...toAppProfile(student), classTeacher: classInfo.classTeacher, subjects: classInfo.subjects });
}
