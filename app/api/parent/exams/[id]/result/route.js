import { NextResponse } from 'next/server';
import { requireParent } from '@/lib/iam';
import { getExamResultForStudent } from '@/lib/examResults';

// GET /parent/exams/:id/result — the signed-in Parent's active child's
// result for one exam, only once the school has actually published it (see
// lib/examResults.js's getExamResultForStudent, which is already gated to
// status: 'Published' and built exactly for this — per-subject marks
// included via `subjectWise`). Returns `null` if nothing's published yet.
export async function GET(request, { params }) {
  const { actor, error } = await requireParent();
  if (error) return error;

  const { id } = await params;
  const result = await getExamResultForStudent(id, actor.studentId);
  return NextResponse.json(result);
}
