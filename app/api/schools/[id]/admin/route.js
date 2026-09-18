import { NextResponse } from 'next/server';
import { createSchoolAdmin } from '@/lib/admins';

export async function POST(request, { params }) {
  const { id } = await params;
  const data = await request.json();

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
