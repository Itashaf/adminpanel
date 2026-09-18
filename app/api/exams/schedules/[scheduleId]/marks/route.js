import { NextResponse } from 'next/server';
import { getMarksSheet, saveExamMarks } from '@/lib/examMarks';
import { getCurrentActor, getCurrentUserInfo } from '@/lib/iam';

// GET /api/exams/schedules/[scheduleId]/marks — the full student roster for
// this schedule with any already-entered marks, the exact shape the Teacher
// marks-entry screen (Phase 3) renders.
export async function GET(request, { params }) {
  const { scheduleId } = await params;
  const currentUser = (await getCurrentUserInfo()) || (await getCurrentActor());
  if (!currentUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  try {
    const sheet = await getMarksSheet(scheduleId, currentUser);
    return NextResponse.json(sheet);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// POST /api/exams/schedules/[scheduleId]/marks — { rows: [{studentId, marksObtained, isAbsent}], submit?: boolean }
// submit=false is "Save Draft"; submit=true is "Submit Marks" (locks further
// edits until an admin approves/rejects — see lib/examMarks.js).
export async function POST(request, { params }) {
  const { scheduleId } = await params;
  const { rows, submit } = await request.json();

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const currentUser = (await getCurrentUserInfo()) || (await getCurrentActor());

  try {
    const saved = await saveExamMarks(scheduleId, rows, currentUser, { submit: Boolean(submit) });
    return NextResponse.json(saved);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
