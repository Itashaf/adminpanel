import { NextResponse } from 'next/server';
import { getMarksForVerification } from '@/lib/examMarks';
import { requirePermission } from '@/lib/rbac';

// GET /api/exams/[id]/verification?className=...&sectionName=...&subject=...
// Admin's marks-verification screen: pick Exam → Class → Section → Subject,
// this resolves the matching ExamSchedule and returns every student's mark.
export async function GET(request, { params }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const className = searchParams.get('className');
  const sectionName = searchParams.get('sectionName') || '';
  const subject = searchParams.get('subject');

  const { error } = await requirePermission('exams.manage');
  if (error) return error;
  if (!className || !subject) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const result = await getMarksForVerification(id, className, sectionName, subject);
  if (!result.schedule) {
    return NextResponse.json({ error: 'No matching exam schedule found.' }, { status: 404 });
  }
  return NextResponse.json(result);
}
