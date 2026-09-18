import { NextResponse } from 'next/server';
import { updateSubject, deleteSubject } from '@/lib/subjects';
import { requireSchoolAdmin } from '@/lib/iam';

export async function PATCH(request, { params }) {
  const { error: authError } = await requireSchoolAdmin();
  if (authError) return authError;

  const { id } = await params;
  const { name, code, type } = await request.json();

  try {
    const subject = await updateSubject(id, { name, code, type });
    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }
    return NextResponse.json(subject);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { error: authError } = await requireSchoolAdmin();
  if (authError) return authError;

  const { id } = await params;
  try {
    const removed = await deleteSubject(id);
    if (!removed) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }
    return NextResponse.json({ removed: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
