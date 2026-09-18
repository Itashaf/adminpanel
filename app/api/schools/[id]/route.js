import { NextResponse } from 'next/server';
import { getSchoolDirectoryEntry, updateSchoolDirectory } from '@/lib/schools';
import { requireSuperAdmin } from '@/lib/iam';

export async function GET(request, { params }) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const { id } = await params;
  const school = await getSchoolDirectoryEntry(id);
  if (!school) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 });
  }
  return NextResponse.json(school);
}

export async function PUT(request, { params }) {
  const { id } = await params;
  const data = await request.json();

  if (!data.name || !data.code || !data.email || !data.phone) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const school = await updateSchoolDirectory(id, data);
    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }
    return NextResponse.json(school);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
