import { NextResponse } from 'next/server';
import { updateSchoolContact } from '@/lib/schoolSettings';
import { requireSchoolAdmin } from '@/lib/iam';

export async function PUT(request) {
  const { error: authError } = await requireSchoolAdmin();
  if (authError) return authError;

  const data = await request.json();

  if (!data.addressLine1 || !data.city || !data.state || !data.country || !data.pinCode) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const school = await updateSchoolContact(data);
  return NextResponse.json(school);
}
