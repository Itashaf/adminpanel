import { NextResponse } from 'next/server';
import { createSchoolAdmin } from '@/lib/admins';
import { requireSuperAdmin } from '@/lib/iam';
import { readJson } from '@/lib/http';

export async function POST(request, { params }) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const { id } = await params;
  const data = await readJson(request);

  if (!data.name || !data.email || !data.password) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const admin = await createSchoolAdmin(id, data);
    return NextResponse.json(admin);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
