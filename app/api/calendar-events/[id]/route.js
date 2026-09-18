import { NextResponse } from 'next/server';
import { updateCalendarEvent, deleteCalendarEvent } from '@/lib/calendarEvents';
import { requireSchoolAdmin } from '@/lib/iam';

export async function PUT(request, { params }) {
  const { error } = await requireSchoolAdmin();
  if (error) return error;

  const { id } = await params;
  const data = await request.json();
  if (!data.title || !data.category || !data.startDate) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const event = await updateCalendarEvent(id, data);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    return NextResponse.json(event);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { error } = await requireSchoolAdmin();
  if (error) return error;

  const { id } = await params;
  const deleted = await deleteCalendarEvent(id);
  if (!deleted) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
