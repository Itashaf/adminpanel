import { NextResponse } from 'next/server';
import { updateSchoolProfile } from '@/lib/schoolSettings';
import { requirePermission } from '@/lib/rbac';
import { readJson } from '@/lib/http';

export async function PUT(request) {
  const { error: authError } = await requirePermission('settings.update');
  if (authError) return authError;

  const data = await readJson(request);

  if (!data.name || !data.code || !data.email || !data.phone) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const school = await updateSchoolProfile(data);
  return NextResponse.json(school);
}
