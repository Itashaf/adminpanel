import { NextResponse } from 'next/server';
import { createHomework, getVisibleHomework } from '@/lib/homework';
import { getCurrentUserInfo } from '@/lib/iam';

// GET /api/homework — mirrors app/api/notices/route.js's GET: real signed-in
// session only (mobile Teacher/Parent JWT or web SchoolAdmin cookie), scoped
// by role inside getVisibleHomework (Teacher → own assigned classes, Parent
// → active child's class, everyone else → everything in the school).
export async function GET() {
  const currentUser = await getCurrentUserInfo();
  if (!currentUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const homework = await getVisibleHomework(currentUser);
  return NextResponse.json(homework);
}

export async function POST(request) {
  const data = await request.json();

  if (!data.academicSession || !data.className || !data.subject || !data.title) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // A real signed-in Teacher (mobile JWT, or web Teacher login) must be
  // scoped to their own classes — getCurrentActor() alone resolves to the
  // web dashboard's role-preview toggle, a global flag with no idea which
  // teacher is actually signed in on this device, which silently let any
  // mobile Teacher assign homework to any class in the school. Real session
  // is required, full stop — the old `sessionUser ||
  // mergeWithDashboardActor(sessionUser)` fallback only ever reached the
  // toggle when unauthenticated (the `||` short-circuits otherwise), and the
  // toggle defaults to `{ role: 'SchoolAdmin' }` with zero credentials,
  // which let anyone create/edit/delete homework with no session at all.
  const currentUser = await getCurrentUserInfo();
  if (!currentUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  try {
    const homework = await createHomework(data, currentUser);
    return NextResponse.json(homework);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
