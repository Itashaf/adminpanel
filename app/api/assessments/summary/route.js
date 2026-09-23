import { NextResponse } from 'next/server';
import { getCurrentUserInfo } from '@/lib/iam';
import { getClassAssessmentSummary } from '@/lib/studentAssessments';

export async function GET(request) {
  const currentUser = await getCurrentUserInfo();
  if (!currentUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const className = searchParams.get('class');
  const sectionName = searchParams.get('section');
  const academicSession = searchParams.get('session');
  const month = Number(searchParams.get('month'));
  const year = Number(searchParams.get('year'));
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || 20));

  if (!className || !sectionName || !academicSession || !month || !year) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const summary = await getClassAssessmentSummary(currentUser, { className, sectionName, academicSession, month, year, page, pageSize });
    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}
