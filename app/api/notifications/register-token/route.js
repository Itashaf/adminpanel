import { NextResponse } from 'next/server';
import { getCurrentUserInfo } from '@/lib/iam';
import { resolveSchoolId } from '@/lib/auth/schoolContext';
import { registerPushToken } from '@/lib/pushTokens';

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

  const { token, platform } = await request.json();
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
