import { NextResponse } from 'next/server';
import { getCurrentUserInfo } from '@/lib/iam';

// GET /api/iam/me — the one "who am I" endpoint for the whole app. Reads the
// httpOnly `edumanage_session` cookie server-side (or the Teacher dashboard
// toggle as a fallback, see lib/iam.js) — the client never holds or reads
// this identity itself, there's nothing to put in localStorage for this.
export async function GET() {
  const user = await getCurrentUserInfo();

  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  return NextResponse.json({ user });
}
