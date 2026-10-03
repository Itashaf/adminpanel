import { NextResponse } from 'next/server';
import { createNotice, getVisibleNotices } from '@/lib/notices';
import { getCurrentUserInfo } from '@/lib/iam';
import { requirePermission } from '@/lib/rbac';

// GET /api/notices — same visibility rule as the web dashboard's notice
// board: see lib/notices.js's getVisibleNotices for the full per-audience
// breakdown (All Staff/All Parents/Role/Class/Individual). Uses
// getCurrentUserInfo() (not
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
  //
  // notices.create is held by Admin-tier and Teacher (Class notices for
  // their own section, scoped/enforced inside createNotice's own
  // assertScopeAllowed) — this permission gate is new; the route previously
  // had no role check at all beyond "any signed-in user", relying entirely
  // on that internal scope check.
  const { error: permError } = await requirePermission('notices.create');
  if (permError) return permError;

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
