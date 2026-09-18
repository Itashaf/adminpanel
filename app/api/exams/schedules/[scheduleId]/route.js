import { NextResponse } from 'next/server';
import { deleteExamSchedule, updateExamSchedule } from '@/lib/examSchedules';
import { getCurrentUserInfo } from '@/lib/iam';

// Any signed-in user may PUT/DELETE here — updateExamSchedule/
// deleteExamSchedule themselves enforce the real rule (admin, or the Class
// Teacher of that row's own class+section).
export async function PUT(request, { params }) {
  const actor = await getCurrentUserInfo();
  if (!actor) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { scheduleId } = await params;
  const data = await request.json();

  if (!data.subject || !data.className || !data.examDate || !data.maxMarks) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (Number(data.passingMarks) > Number(data.maxMarks)) {
    return NextResponse.json({ error: 'Passing marks cannot exceed maximum marks.' }, { status: 400 });
  }

  try {
    const schedule = await updateExamSchedule(scheduleId, data, actor);
    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }
    return NextResponse.json(schedule);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const actor = await getCurrentUserInfo();
  if (!actor) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { scheduleId } = await params;

  try {
    const deleted = await deleteExamSchedule(scheduleId, actor);
    if (!deleted) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
