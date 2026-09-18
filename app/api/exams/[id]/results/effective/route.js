import { NextResponse } from 'next/server';
import { getEffectiveExamResult } from '@/lib/examResults';
import { requireSchoolAdmin } from '@/lib/iam';

// GET /api/exams/[id]/results/effective?studentId=... — the reconciled
// result for a Re-Test/Improvement/Supplementary exam (see
// lib/examResults.js's getEffectiveExamResult), applying that exam's own
// retakeResultPolicy (Best/Latest/Average) against its parent exam's
// result. For a normal exam with no parentExamId this is just its own
// result, unchanged.
export async function GET(request, { params }) {
  const { error: authError } = await requireSchoolAdmin();
  if (authError) return authError;

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');
  if (!studentId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const result = await getEffectiveExamResult(id, studentId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
