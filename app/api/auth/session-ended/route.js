import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/auth/session';

// Landing spot for a browser whose session is no longer valid (account deactivated,
// school suspended, ...). The cookie still exists and still looks fine to the
// middleware, so redirecting straight to /login would bounce back to the app in a
// loop; clearing it first breaks that.
export async function GET(request) {
  await clearSession();
  return NextResponse.redirect(new URL('/login?expired=1', request.url));
}
