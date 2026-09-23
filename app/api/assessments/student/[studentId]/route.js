import { NextResponse } from 'next/server';
import { getCurrentUserInfo } from '@/lib/iam';
import { getAssessmentForStudent, saveAssessment } from '@/lib/studentAssessments';

// GET /api/assessments/student/[studentId]?month=&year= — the wizard's
// full load: student card, auto-filled attendance/exam context, and any
// existing assessment for that month.
export async function GET(request, { params }) {
  const currentUser = await getCurrentUserInfo();
  if (!currentUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { studentId } = await params;
  const { searchParams } = new URL(request.url);
  const month = Number(searchParams.get('month'));
  const year = Number(searchParams.get('year'));
  if (!month || !year) {
    return NextResponse.json({ error: 'Missing month/year' }, { status: 400 });
  }

  try {
    const result = await getAssessmentForStudent(studentId, month, year, currentUser);
    if (!result) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

// PUT /api/assessments/student/[studentId] — { month, year, submit, ...data }
// submit=false is autosave/Save Draft; submit=true is the final Submit
// (locks status to COMPLETED — see lib/studentAssessments.js's saveAssessment).
export async function PUT(request, { params }) {
  const currentUser = await getCurrentUserInfo();
  if (!currentUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { studentId } = await params;
  const { month, year, submit, ...data } = await request.json();
  if (!month || !year) {
    return NextResponse.json({ error: 'Missing month/year' }, { status: 400 });
  }

  try {
    const assessment = await saveAssessment(studentId, month, year, data, currentUser, { submit: Boolean(submit) });
    return NextResponse.json(assessment);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
