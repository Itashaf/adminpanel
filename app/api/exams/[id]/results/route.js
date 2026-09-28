import { NextResponse } from 'next/server';
import { generateExamResults, getExamResultForStudent, getExamResults } from '@/lib/examResults';
import { getCurrentUserInfo } from '@/lib/iam';
import { requirePermission } from '@/lib/rbac';

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

  const { error: permError } = await requirePermission('results.view');
  if (permError) return permError;

  const currentUser = await getCurrentUserInfo();
  if (!currentUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  if (currentUser.role === 'Parent') {
    const result = await getExamResultForStudent(id, currentUser.studentId);
    return NextResponse.json(result ? [result] : []);
  }

  // Only an Admin sees the full, unfiltered results list (every student,
  // any status including unpublished Draft) — Teacher also holds
  // results.view (for a future scoped view that doesn't exist yet), but
  // this role check already excludes Teacher on its own (Teacher's legacy
  // role is 'Teacher', never 'SchoolAdmin'/'SuperAdmin') — the permission
  // gate above only adds "block Accountant/Parent-shaped tokens that
  // shouldn't reach this route at all", it doesn't need a second Teacher
  // check on top.
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

// generateExamResults() calls its own assertIsAdmin() internally, checking
// currentUser.role (legacy 'SchoolAdmin'/'SuperAdmin' string) — the RBAC
// actor from requirePermission only has roleKey, so getCurrentUserInfo()'s
// legacy-shaped actor is what actually gets passed in below, same fix as
// the Marks module's verify route.
export async function POST(request, { params }) {
  const { error: authError } = await requirePermission('results.publish');
  if (authError) return authError;

  const actor = await getCurrentUserInfo();
  const { id } = await params;

  try {
    const outcome = await generateExamResults(id, actor);
    return NextResponse.json(outcome);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
