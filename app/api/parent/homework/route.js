import { NextResponse } from 'next/server';
import { requireParent } from '@/lib/iam';
import { getStudentById } from '@/lib/students';
import { getHomeworkPageForStudent } from '@/lib/homework';

const MAX_PAGE_SIZE = 50;

// Paged homework for the Parent portal's active child — only that child's
// class/section (see lib/homework.js's getHomeworkPageForStudent), so a
// parent can never page into another class's homework.
export async function GET(request) {
  const { actor, error } = await requireParent();
  if (error) return error;

  const student = await getStudentById(actor.studentId, actor.schoolId);
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const page = Math.max(Number(searchParams.get('page')) || 1, 1);
  const pageSize = Math.min(Math.max(Number(searchParams.get('pageSize')) || 10, 1), MAX_PAGE_SIZE);

  const result = await getHomeworkPageForStudent(student, {
    search: searchParams.get('search') || '',
    subject: searchParams.get('subject') || '',
    page,
    pageSize,
  });
  return NextResponse.json(result);
}
