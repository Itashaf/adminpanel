import { NextResponse } from 'next/server';
import { addExamSchedule, getVisibleExamSchedules } from '@/lib/examSchedules';
import { getCurrentUserInfo } from '@/lib/iam';

export async function GET(request, { params }) {
  const { id } = await params;
  const currentUser = await getCurrentUserInfo();
  if (!currentUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const schedules = await getVisibleExamSchedules(id, currentUser);
  return NextResponse.json(schedules);
}

// Any signed-in user may POST here now — a Class Teacher can add a subject
// to their own class+section's date sheet, same as an admin. The real
// authorization (admin, or Class Teacher of *that* class+section) happens
// inside addExamSchedule itself; this route only checks someone is signed
// in at all.
export async function POST(request, { params }) {
  const actor = await getCurrentUserInfo();
  if (!actor) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { id } = await params;
  const data = await request.json();

  if (!data.subject || !data.className || !data.examDate || !data.maxMarks) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (Number(data.passingMarks) > Number(data.maxMarks)) {
    return NextResponse.json({ error: 'Passing marks cannot exceed maximum marks.' }, { status: 400 });
  }

  try {
    const schedule = await addExamSchedule(id, data, actor);
    return NextResponse.json(schedule);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
