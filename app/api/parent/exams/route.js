import { NextResponse } from 'next/server';
import { requireParent } from '@/lib/iam';
import { getStudentById } from '@/lib/students';
import { getExamsPageForStudent } from '@/lib/exams';

const MAX_PAGE_SIZE = 50;

// One page of the Parent portal's Exams for the active child — their own
// class and session only, never a Draft, never one with no date sheet for
// their class (see lib/exams.js's parentExamWhere).
export async function GET(request) {
  const { actor, error } = await requireParent();
  if (error) return error;

  const student = await getStudentById(actor.studentId, actor.schoolId);
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const page = Math.max(Number(searchParams.get('page')) || 1, 1);
  const pageSize = Math.min(Math.max(Number(searchParams.get('pageSize')) || 10, 1), MAX_PAGE_SIZE);

  const result = await getExamsPageForStudent(student, { page, pageSize });
  return NextResponse.json(result);
}
