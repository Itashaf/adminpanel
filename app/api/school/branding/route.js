import { NextResponse } from 'next/server';
import { updateSchoolBranding } from '@/lib/schoolSettings';
import { requirePermission } from '@/lib/rbac';

export async function PUT(request) {
  const { error: authError } = await requirePermission('settings.update');
  if (authError) return authError;

  const data = await request.json();

  if (!data.displayName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const school = await updateSchoolBranding(data);
  return NextResponse.json(school);
}
