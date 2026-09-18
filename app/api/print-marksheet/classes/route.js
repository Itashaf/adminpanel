import { NextResponse } from 'next/server';
import { getPrintableClassSections } from '@/lib/printMarksheet';
import { getCurrentActor, getCurrentUserInfo } from '@/lib/iam';

export async function GET() {
  const currentUser = (await getCurrentUserInfo()) || (await getCurrentActor());
  if (!currentUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const classSections = await getPrintableClassSections(currentUser);
  return NextResponse.json(classSections);
}
