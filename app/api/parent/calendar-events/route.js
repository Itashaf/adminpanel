import { NextResponse } from 'next/server';
import { requireParent } from '@/lib/iam';
import { getAllCalendarEvents } from '@/lib/calendarEvents';

// School-wide, same as the teacher-facing route — every parent at the
// school sees the same calendar. Only isVisible events reach the client.
export async function GET() {
  const { actor, error } = await requireParent();
  if (error) return error;

  const events = await getAllCalendarEvents(actor.schoolId);
  return NextResponse.json(events.filter((e) => e.isVisible));
}
