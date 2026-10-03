import { NextResponse } from 'next/server';
import { deleteExam, getExamById, updateExam } from '@/lib/exams';
import { getCurrentUserInfo } from '@/lib/iam';
import { requirePermission } from '@/lib/rbac';

export async function GET(request, { params }) {
  const { id } = await params;
  const currentUser = await getCurrentUserInfo();
  if (!currentUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const exam = await getExamById(id);
  if (!exam) {
    return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
  }
  return NextResponse.json(exam);
}

export async function PUT(request, { params }) {
  const { error: authError } = await requirePermission('exams.manage');
  if (authError) return authError;

  // requirePermission's own `user` is the RBAC-shaped actor (`roleKey`,
  // `permissions`) — lib/exams.js's assertIsAdmin/assertCanSetExamStatus
  // check the legacy shape (`role`, `teacherId`) instead, same convention
  // app/api/notices/route.js already uses: requirePermission is only the
  // coarse "can even attempt this" gate, getCurrentUserInfo() is the actor
  // actually passed into the lib function.
  const currentUser = await getCurrentUserInfo();
  if (!currentUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { id } = await params;
  const data = await request.json();

  if (!data.name || !data.academicSession || !data.examType || !data.startDate || !data.endDate || !data.classes?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const exam = await updateExam(id, data, currentUser);
    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }
    return NextResponse.json(exam);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { error: authError } = await requirePermission('exams.manage');
  if (authError) return authError;

  const currentUser = await getCurrentUserInfo();
  if (!currentUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const deleted = await deleteExam(id, currentUser);
    if (!deleted) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
