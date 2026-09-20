import { NextResponse } from 'next/server';
import { createNotice, getVisibleNotices } from '@/lib/notices';
import { getCurrentUserInfo, mergeWithDashboardActor } from '@/lib/iam';

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

  // A real Teacher session must be scoped by their own classTeacherOf —
  // getCurrentActor() alone resolves to the web dashboard's role-preview
  // toggle, which never carries that field (same fix as app/api/homework's
  // POST) and would leave a real Class Teacher unable to post to their own
  // section, or worse, let the toggle's stale class silently apply instead.
  const sessionUser = await getCurrentUserInfo();
  const currentUser = sessionUser || (await mergeWithDashboardActor(sessionUser));

  try {
    const notice = await createNotice(data, currentUser);
    return NextResponse.json(notice);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
