import { NextResponse } from 'next/server';
import { cleanupOldTickets } from '@/lib/support';

// Vercel Cron (see vercel.json's "crons" entry, daily) — purges Support
// tickets (and their R2 attachments) with no activity in 3 months. Same
// CRON_SECRET bearer check as app/api/cron/generate-fees/route.js.
export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  // Fails closed: with no CRON_SECRET configured nobody can call this.
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await cleanupOldTickets();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error('cleanup-support-tickets cron failed', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
