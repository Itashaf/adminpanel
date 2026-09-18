import { NextResponse } from 'next/server';
import { getPrintableClassSections, getPrintableRoster } from '@/lib/printMarksheet';
import { getCurrentActor, getCurrentUserInfo } from '@/lib/iam';

// GET /api/print-marksheet?className=...&sectionName=...
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const className = searchParams.get('className');
  const sectionName = searchParams.get('sectionName');

  const currentUser = (await getCurrentUserInfo()) || (await getCurrentActor());
  if (!currentUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }
  if (!className || !sectionName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Re-derive the caller's own allowed class+sections rather than trusting
  // the query params directly — a Teacher must never be able to pull
  // another class's roster just by editing the URL.
  const allowed = await getPrintableClassSections(currentUser);
  const match = allowed.find((c) => c.className === className && c.sectionName === sectionName);
  if (!match) {
    return NextResponse.json({ error: 'You do not have access to this class and section.' }, { status: 403 });
  }

  const students = await getPrintableRoster(className, sectionName, match.academicSession);
  return NextResponse.json({ className, sectionName, students });
}
