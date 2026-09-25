import { NextResponse } from 'next/server';
import { getCurrentUserInfo } from '@/lib/iam';
import { getRecentlyAssessed } from '@/lib/studentAssessments';

export async function GET() {
  const currentUser = await getCurrentUserInfo();
  if (!currentUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  try {
    const recent = await getRecentlyAssessed(currentUser, 5);
    return NextResponse.json(recent);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}
