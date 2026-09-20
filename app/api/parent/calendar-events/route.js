import { NextResponse } from 'next/server';
import { requireParent } from '@/lib/iam';
import { getStudentById } from '@/lib/students';
import { getCalendarEventsForStudent } from '@/lib/calendarEvents';

// Scoped to the active child's class/section — same rule as the Parent web
// portal's app/parent/calendar/page.jsx (Whole School always shows,
// Specific Class needs the child's class, Specific Section needs an exact
// class+section match). Previously this returned every isVisible event
// school-wide, unlike the web portal; kept in sync with it now.
export async function GET() {
  const { actor, error } = await requireParent();
  if (error) return error;

  const student = await getStudentById(actor.studentId, actor.schoolId);
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

  const events = await getCalendarEventsForStudent(actor.schoolId, student);
  return NextResponse.json(events);
}
