import { NextResponse } from 'next/server';
import { updateSchoolProfile } from '@/lib/schoolSettings';

export async function PUT(request) {
  const data = await request.json();

  if (!data.name || !data.code || !data.email || !data.phone) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const school = await updateSchoolProfile(data);
  return NextResponse.json(school);
}
