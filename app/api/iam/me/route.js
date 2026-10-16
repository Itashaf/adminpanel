import { NextResponse } from 'next/server';
import { getCurrentUserInfo } from '@/lib/iam';
import { getCurrentRBACUser } from '@/lib/rbac';

// GET /api/iam/me — the one "who am I" endpoint for the whole app. Reads the
// httpOnly `schoolapp360_session` cookie server-side (or the Teacher dashboard
// toggle as a fallback, see lib/iam.js) — the client never holds or reads
// this identity itself, there's nothing to put in localStorage for this.
export async function GET() {
  const user = await getCurrentUserInfo();

  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  // roleKey + permission keys (live from the DB, same source as the web
  // Sidebar's filterByPermissions) so the mobile app can gate its own menu
  // the same way instead of hardcoding a per-role list.
  const rbacUser = await getCurrentRBACUser();
  return NextResponse.json({
    user: { ...user, roleKey: rbacUser?.roleKey ?? null, permissions: rbacUser ? [...rbacUser.permissions] : [] },
  });
}
