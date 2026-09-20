import { NextResponse } from 'next/server';
import { updateNotice, deleteNotice, getNoticeById } from '@/lib/notices';
import { getCurrentUserInfo, mergeWithDashboardActor } from '@/lib/iam';

// A real Teacher session must be scoped by their own classTeacherOf/teacherId
// (for the scope check and the postedByTeacherId ownership check) —
// getCurrentActor() alone resolves to the web dashboard's role-preview
// toggle, which never carries classTeacherOf (same fix as app/api/notices'
// POST and app/api/homework's POST).
async function resolveActor() {
  const sessionUser = await getCurrentUserInfo();
  return sessionUser || (await mergeWithDashboardActor(sessionUser));
}

// GET /api/notices/:id — see app/api/notices/route.js's GET for why this
// uses getCurrentUserInfo() rather than getCurrentActor(). A Teacher asking
// for a notice outside their own scope gets the same 404 as a genuinely
// missing id (see lib/notices.js's getNoticeById) rather than a 403 that
// would confirm the notice exists.
export async function GET(request, { params }) {
  const { id } = await params;
  const currentUser = await getCurrentUserInfo();
  if (!currentUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const notice = await getNoticeById(id, currentUser);
  if (!notice) {
    return NextResponse.json({ error: 'Notice not found' }, { status: 404 });
  }
  return NextResponse.json(notice);
}

export async function PUT(request, { params }) {
  const { id } = await params;
  const data = await request.json();

  if (!data.title || !data.message || !data.audience) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const currentUser = await resolveActor();

  try {
    const notice = await updateNotice(id, data, currentUser);
    if (!notice) {
      return NextResponse.json({ error: 'Notice not found' }, { status: 404 });
    }
    return NextResponse.json(notice);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const currentUser = await resolveActor();

  try {
    const deleted = await deleteNotice(id, currentUser);
    if (!deleted) {
      return NextResponse.json({ error: 'Notice not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
