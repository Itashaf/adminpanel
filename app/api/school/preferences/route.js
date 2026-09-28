import { NextResponse } from 'next/server';
import { updateSchoolPreferences } from '@/lib/schoolSettings';
import { requirePermission } from '@/lib/rbac';

export async function PUT(request) {
  const { error: authError } = await requirePermission('settings.update');
  if (authError) return authError;

  const data = await request.json();

  if (!data.timezone || !data.currency || !data.dateFormat || !data.studentIdPrefix || !data.teacherIdPrefix) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const school = await updateSchoolPreferences(data);
  return NextResponse.json(school);
}
