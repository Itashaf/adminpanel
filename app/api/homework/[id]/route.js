import { NextResponse } from 'next/server';
import { updateHomework, deleteHomework } from '@/lib/homework';
import { getCurrentUserInfo } from '@/lib/iam';

export async function PUT(request, { params }) {
  const { id } = await params;
  const data = await request.json();

  if (!data.academicSession || !data.className || !data.subject || !data.title) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Real session required — see app/api/homework/route.js's POST for why the
  // old toggle-fallback pattern let anyone edit any homework unauthenticated.
  const currentUser = await getCurrentUserInfo();
  if (!currentUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

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
  const currentUser = await getCurrentUserInfo();
  if (!currentUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

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
