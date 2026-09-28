import { NextResponse } from 'next/server';
import { getCurrentUserInfo } from '@/lib/iam';
import { isModuleEnabled } from '@/lib/featureFlagGuard';
import { getRecentlyAssessed } from '@/lib/studentAssessments';

export async function GET() {
  const currentUser = await getCurrentUserInfo();
  if (!currentUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }
  if (!(await isModuleEnabled('assessments'))) {
    return NextResponse.json({ error: 'This module is not enabled for your school.' }, { status: 403 });
  }

  try {
    const recent = await getRecentlyAssessed(currentUser, 5);
    return NextResponse.json(recent);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}
