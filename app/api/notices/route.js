import { NextResponse } from 'next/server';
import { createNotice, getVisibleNotices } from '@/lib/notices';
import { getCurrentUserInfo } from '@/lib/iam';

// GET /api/notices — same visibility rule as the web dashboard's notice
// board: everyone sees "Whole School" notices, a Teacher additionally sees
// "Class" notices for their own assigned class+section (see
// lib/notices.js's getVisibleNotices). Uses getCurrentUserInfo() (not
// getCurrentActor()) because this only needs to serve a real signed-in
// session — mobile's Teacher/Parent JWT or a web SchoolAdmin cookie — not
// the web dashboard's role-preview toggle.
export async function GET() {
  const currentUser = await getCurrentUserInfo();
  if (!currentUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const notices = await getVisibleNotices(currentUser);
  return NextResponse.json(notices);
}

export async function POST(request) {
  const data = await request.json();

  if (!data.title || !data.message || !data.audience) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Real session required, full stop — `sessionUser || mergeWithDashboardActor(sessionUser)`
  // only ever reaches the toggle when sessionUser is null (the `||` short-
  // circuits otherwise), which is exactly the unauthenticated case: the
  // toggle's own fallback (lib/currentUser.js) defaults to
  // `{ role: 'SchoolAdmin' }` with zero credentials, so that pattern let
  // anyone POST a notice as SchoolAdmin (or as whatever teacher the process-
  // wide toggle happened to be set to) with no session at all.
  const currentUser = await getCurrentUserInfo();
  if (!currentUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  try {
    const notice = await createNotice(data, currentUser);
    return NextResponse.json(notice);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
