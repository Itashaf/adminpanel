import { NextResponse } from 'next/server';
import { createExam, getVisibleExams } from '@/lib/exams';
import { getCurrentUserInfo, requireSchoolAdmin } from '@/lib/iam';

export async function GET() {
  const currentUser = await getCurrentUserInfo();
  if (!currentUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const exams = await getVisibleExams(currentUser);
  return NextResponse.json(exams);
}

export async function POST(request) {
  const { error: authError, actor } = await requireSchoolAdmin();
  if (authError) return authError;

  const data = await request.json();

  if (!data.name || !data.academicSession || !data.examType || !data.startDate || !data.endDate || !data.classes?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const exam = await createExam(data, actor);
    return NextResponse.json(exam);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
