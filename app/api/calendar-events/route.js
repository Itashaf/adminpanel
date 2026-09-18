import { NextResponse } from 'next/server';
import { getAllCalendarEvents, createCalendarEvent } from '@/lib/calendarEvents';
import { requireSchoolAdmin } from '@/lib/iam';

export async function GET() {
  const { error } = await requireSchoolAdmin();
  if (error) return error;

  const events = await getAllCalendarEvents();
  return NextResponse.json(events);
}

export async function POST(request) {
  const { error } = await requireSchoolAdmin();
  if (error) return error;

  const data = await request.json();
  if (!data.title || !data.category || !data.startDate) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const event = await createCalendarEvent(data);
    return NextResponse.json(event);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
