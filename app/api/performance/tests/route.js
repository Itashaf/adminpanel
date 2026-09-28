import { NextResponse } from 'next/server';
import { createSubjectTest, getSubjectTests } from '@/lib/performance/subjectTests';
import { requirePermission } from '@/lib/rbac';
import { getCurrentUserInfo } from '@/lib/iam';
import { getCurrentUser } from '@/lib/currentUser';

export async function GET(request) {
  const { error } = await requirePermission('performanceReports.view');
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const tests = await getSubjectTests({
    academicSession: searchParams.get('academicSession') || '',
    className: searchParams.get('class') || '',
    sectionName: searchParams.get('section') || '',
    subjectId: searchParams.get('subjectId') || '',
    teacherId: searchParams.get('teacherId') || '',
  });
  return NextResponse.json(tests);
}

export async function POST(request) {
  const { error } = await requirePermission('performanceReports.tests.manage');
  if (error) return error;

  const currentUser = (await getCurrentUserInfo()) || (await getCurrentUser());
  const body = await request.json();

  try {
    const test = await createSubjectTest(currentUser, body);
    return NextResponse.json(test);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
