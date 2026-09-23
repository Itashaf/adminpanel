import { NextResponse } from 'next/server';
import { updateSchoolDirectoryStatus } from '@/lib/schools';
import { requireSuperAdmin } from '@/lib/iam';

export async function PATCH(request, { params }) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const { id } = await params;
  const { status } = await request.json();

  if (!status) {
    return NextResponse.json({ error: 'Missing status' }, { status: 400 });
  }

  const school = await updateSchoolDirectoryStatus(id, status);
  if (!school) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 });
  }

  return NextResponse.json(school);
}
