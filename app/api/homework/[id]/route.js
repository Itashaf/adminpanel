import { NextResponse } from 'next/server';
import { updateHomework, deleteHomework } from '@/lib/homework';
import { getCurrentUserInfo, mergeWithDashboardActor } from '@/lib/iam';

export async function PUT(request, { params }) {
  const { id } = await params;
  const data = await request.json();

  if (!data.academicSession || !data.className || !data.subject || !data.title) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // See app/api/homework/route.js's POST for why the real session takes
  // priority over the dashboard toggle here.
  const sessionUser = await getCurrentUserInfo();
  const currentUser = sessionUser || (await mergeWithDashboardActor(sessionUser));

  try {
    const homework = await updateHomework(id, data, currentUser);
    if (!homework) {
      return NextResponse.json({ error: 'Homework not found' }, { status: 404 });
    }
    return NextResponse.json(homework);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const sessionUser = await getCurrentUserInfo();
  const currentUser = sessionUser || (await mergeWithDashboardActor(sessionUser));

  try {
    const deleted = await deleteHomework(id, currentUser);
    if (!deleted) {
      return NextResponse.json({ error: 'Homework not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
