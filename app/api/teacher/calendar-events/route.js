import { NextResponse } from 'next/server';
import { requireTeacher } from '@/lib/iam';
import { getAllCalendarEvents } from '@/lib/calendarEvents';

// Not class-scoped — every teacher at the school sees the same school-wide
// calendar (unlike Notices/Homework, which scope to a teacher's own
// assigned classes). Only isVisible events reach the client; the admin
// panel's own list (getAllCalendarEvents via the RSC page) shows hidden
// ones too since that's an authoring view, not a consumer one.
export async function GET() {
  const { actor, error } = await requireTeacher();
  if (error) return error;

  const events = await getAllCalendarEvents(actor.schoolId);
  return NextResponse.json(events.filter((e) => e.isVisible));
}
