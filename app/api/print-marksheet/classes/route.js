import { NextResponse } from 'next/server';
import { getPrintableClassSections } from '@/lib/printMarksheet';
import { getCurrentUserInfo } from '@/lib/iam';

export async function GET() {
  // Real session required — the old `sessionUser ||
  // mergeWithDashboardActor(sessionUser)` pattern's `if (!currentUser)`
  // check below was dead code (mergeWithDashboardActor(null) always returns
  // the toggle's default SchoolAdmin object, never null), so this let an
  // unauthenticated caller list every class+section in the school.
  const currentUser = await getCurrentUserInfo();
  if (!currentUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const classSections = await getPrintableClassSections(currentUser);
  return NextResponse.json(classSections);
}
