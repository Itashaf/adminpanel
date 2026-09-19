import { NextResponse } from 'next/server';
import { getPrintableClassSections } from '@/lib/printMarksheet';
import { getCurrentUserInfo, mergeWithDashboardActor } from '@/lib/iam';

export async function GET() {
  const sessionUser = await getCurrentUserInfo();
  const currentUser = sessionUser || (await mergeWithDashboardActor(sessionUser));
  if (!currentUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const classSections = await getPrintableClassSections(currentUser);
  return NextResponse.json(classSections);
}
