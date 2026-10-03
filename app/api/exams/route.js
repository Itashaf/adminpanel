import { NextResponse } from 'next/server';
import { createExam, getVisibleExams } from '@/lib/exams';
import { getCurrentUserInfo } from '@/lib/iam';
import { requirePermission } from '@/lib/rbac';

export async function GET() {
  const currentUser = await getCurrentUserInfo();
  if (!currentUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const exams = await getVisibleExams(currentUser);
  return NextResponse.json(exams);
}

export async function POST(request) {
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

  const data = await request.json();

  if (!data.name || !data.academicSession || !data.examType || !data.startDate || !data.endDate || !data.classes?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const exam = await createExam(data, currentUser);
    return NextResponse.json(exam);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
