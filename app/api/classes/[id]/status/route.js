import { NextResponse } from 'next/server';
import { updateClassStatus } from '@/lib/classes';
import { requireSchoolAdmin } from '@/lib/iam';

export async function PATCH(request, { params }) {
  const { error: authError } = await requireSchoolAdmin();
  if (authError) return authError;

  const { id } = await params;
  const { status } = await request.json();

  if (!status) {
    return NextResponse.json({ error: 'Missing status' }, { status: 400 });
  }

  const cls = await updateClassStatus(id, status);
  if (!cls) {
    return NextResponse.json({ error: 'Class not found' }, { status: 404 });
  }

  return NextResponse.json({ id: cls.id, status: cls.status });
}
