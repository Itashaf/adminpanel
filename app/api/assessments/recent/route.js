import { NextResponse } from 'next/server';
import { getCurrentUserInfo } from '@/lib/iam';
import { getRecentlyAssessed } from '@/lib/studentAssessments';

export async function GET() {
  const currentUser = await getCurrentUserInfo();
  if (!currentUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const recent = await getRecentlyAssessed(currentUser, 5);
  return NextResponse.json(recent);
}
