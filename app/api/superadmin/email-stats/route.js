import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/iam';
import { getBrevoOverview } from '@/lib/brevo';

// GET /api/superadmin/email-stats[?refresh=1] — Brevo plan, sending limit, delivery counts and the
// latest message events. Super Admin only. Answers are cached for a minute; refresh=1 skips the cache.
export async function GET(request) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const force = new URL(request.url).searchParams.get('refresh') === '1';
  try {
    return NextResponse.json(await getBrevoOverview({ force }));
  } catch (err) {
    console.error('email stats failed', err);
    return NextResponse.json({ error: 'Could not load the email statistics.' }, { status: 502 });
  }
}
