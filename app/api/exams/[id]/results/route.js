import { NextResponse } from 'next/server';
import { generateExamResults, getExamResultForStudent, getExamResults } from '@/lib/examResults';
import { getCurrentUserInfo, requireSchoolAdmin } from '@/lib/iam';

// GET /api/exams/[id]/results — Admin sees every student's result (any
// status); a Parent gets only their active child's, and only once published.
// An admin passing ?studentId=... gets that one student's full breakdown
// instead (subject-wise marks included) — used to build the printable
// report card, which needs per-subject rows getExamResults' summary list
// doesn't carry.
export async function GET(request, { params }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');
  const currentUser = await getCurrentUserInfo();
  if (!currentUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  if (currentUser.role === 'Parent') {
    const result = await getExamResultForStudent(id, currentUser.studentId);
    return NextResponse.json(result ? [result] : []);
  }

  // Only an Admin sees the full, unfiltered results list (every student,
  // any status including unpublished Draft) — a Teacher has no scoped view
  // of this yet, so give them nothing rather than leaking other classes'
  // and other students' unpublished results.
  if (currentUser.role !== 'SchoolAdmin' && currentUser.role !== 'SuperAdmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (studentId) {
    const result = await getExamResultForStudent(id, studentId);
    if (!result) return NextResponse.json({ error: 'Result not found (not generated or not published yet).' }, { status: 404 });
    return NextResponse.json(result);
  }

  const results = await getExamResults(id);
  return NextResponse.json(results);
}

export async function POST(request, { params }) {
  const { error: authError, actor } = await requireSchoolAdmin();
  if (authError) return authError;

  const { id } = await params;

  try {
    const outcome = await generateExamResults(id, actor);
    return NextResponse.json(outcome);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
