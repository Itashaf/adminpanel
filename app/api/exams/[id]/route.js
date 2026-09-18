import { NextResponse } from 'next/server';
import { deleteExam, getExamById, updateExam } from '@/lib/exams';
import { getCurrentUserInfo, requireSchoolAdmin } from '@/lib/iam';

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
  const { error: authError, actor } = await requireSchoolAdmin();
  if (authError) return authError;

  const { id } = await params;
  const data = await request.json();

  if (!data.name || !data.academicSession || !data.examType || !data.startDate || !data.endDate || !data.classes?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const exam = await updateExam(id, data, actor);
    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }
    return NextResponse.json(exam);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { error: authError, actor } = await requireSchoolAdmin();
  if (authError) return authError;

  const { id } = await params;

  try {
    const deleted = await deleteExam(id, actor);
    if (!deleted) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
