import { NextResponse } from 'next/server';
import { duplicateExam } from '@/lib/exams';
import { requirePermission } from '@/lib/rbac';

export async function POST(request, { params }) {
  const { error: authError, user: actor } = await requirePermission('exams.manage');
  if (authError) return authError;

  const { id } = await params;

  try {
    const exam = await duplicateExam(id, actor);
    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }
    return NextResponse.json(exam);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
