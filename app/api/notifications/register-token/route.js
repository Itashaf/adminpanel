import { NextResponse } from 'next/server';
import { getCurrentUserInfo } from '@/lib/iam';
import { resolveSchoolId } from '@/lib/auth/schoolContext';
import { registerPushToken, unregisterPushToken } from '@/lib/pushTokens';
import { readJson } from '@/lib/http';

// POST /api/notifications/register-token — called by the mobile app on
// launch/sign-in (see schoolapp360's pushTokenApi.js) to save this device's
// Expo push token against whoever's actually signed in. Same
// getCurrentUserInfo() session check as app/api/notices/route.js's GET —
// this only ever serves a real signed-in session (mobile Teacher/Parent JWT
// or a web SchoolAdmin cookie), never the dashboard's role-preview toggle.
export async function POST(request) {
  const currentUser = await getCurrentUserInfo();
  if (!currentUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { token, platform } = await readJson(request);
  if (!token || !platform) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  // Parent's session carries no schoolId directly (see lib/iam.js's
  // getCurrentUserInfo) — resolveSchoolId() falls back to it via the
  // session-scoped lookup every other Parent-facing route already relies on.
  const schoolId = currentUser.schoolId || (await resolveSchoolId());

  await registerPushToken({
    schoolId,
    ownerRole: currentUser.role,
    ownerId: currentUser.id,
    token,
    platform,
  });

  return NextResponse.json({ success: true });
}

// DELETE /api/notifications/register-token — { token }. Called by the mobile app when
// the user logs out, so the next person to sign in on this phone does not receive the
// previous user's notifications.
export async function DELETE(request) {
  const currentUser = await getCurrentUserInfo();
  if (!currentUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { token } = await readJson(request);
  if (!token) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  await unregisterPushToken({ ownerRole: currentUser.role, ownerId: currentUser.id, token });
  return NextResponse.json({ success: true });
}
