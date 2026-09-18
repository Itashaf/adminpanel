import { NextResponse } from 'next/server';
import { updateClass, deleteClass } from '@/lib/classes';
import { requireSchoolAdmin } from '@/lib/iam';

export async function PUT(request, { params }) {
  const { error: authError } = await requireSchoolAdmin();
  if (authError) return authError;

  const { id } = await params;
  const data = await request.json();

  if (!data.level) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const cls = await updateClass(id, data);
    if (!cls) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }
    return NextResponse.json(cls);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { error: authError } = await requireSchoolAdmin();
  if (authError) return authError;

  const { id } = await params;
  const removed = await deleteClass(id);
  if (!removed) {
    return NextResponse.json({ error: 'Class not found' }, { status: 404 });
  }
  return NextResponse.json({ removed: true });
}
