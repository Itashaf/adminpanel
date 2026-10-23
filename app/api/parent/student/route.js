import { NextResponse } from 'next/server';
import { getStudentById, getStudentClassInfo, toAppProfile } from '@/lib/students';
import { requireParent } from '@/lib/iam';

// GET /api/parent/student — the signed-in parent's active child (never a student id from the
// request). Same trimmed profile the Class Teacher sees, see toAppProfile.
export async function GET() {
  const { actor, error } = await requireParent();
  if (error) return error;

  const student = await getStudentById(actor.studentId, actor.schoolId);
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

  const classInfo = await getStudentClassInfo(student, actor.schoolId);
  return NextResponse.json({ ...toAppProfile(student), classTeacher: classInfo.classTeacher, subjects: classInfo.subjects });
}
