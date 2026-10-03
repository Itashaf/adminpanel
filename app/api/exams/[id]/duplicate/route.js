import { NextResponse } from 'next/server';
import { duplicateExam } from '@/lib/exams';
import { getCurrentUserInfo } from '@/lib/iam';
import { requirePermission } from '@/lib/rbac';

export async function POST(request, { params }) {
  const { error: authError } = await requirePermission('exams.manage');
  if (authError) return authError;

  // See app/api/exams/route.js's same comment — lib/exams.js's assertIsAdmin
  // checks the legacy `.role` shape, not requirePermission's RBAC actor.
  const currentUser = await getCurrentUserInfo();
  if (!currentUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const exam = await duplicateExam(id, currentUser);
    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }
    return NextResponse.json(exam);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
