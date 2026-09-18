import { NextResponse } from 'next/server';
import { getMarksForVerification } from '@/lib/examMarks';
import { getCurrentUserInfo } from '@/lib/iam';

// GET /api/exams/[id]/verification?className=...&sectionName=...&subject=...
// Admin's marks-verification screen: pick Exam → Class → Section → Subject,
// this resolves the matching ExamSchedule and returns every student's mark.
export async function GET(request, { params }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const className = searchParams.get('className');
  const sectionName = searchParams.get('sectionName') || '';
  const subject = searchParams.get('subject');

  const currentUser = await getCurrentUserInfo();
  if (!currentUser || (currentUser.role !== 'SchoolAdmin' && currentUser.role !== 'SuperAdmin')) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }
  if (!className || !subject) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const result = await getMarksForVerification(id, className, sectionName, subject);
  if (!result.schedule) {
    return NextResponse.json({ error: 'No matching exam schedule found.' }, { status: 404 });
  }
  return NextResponse.json(result);
}
