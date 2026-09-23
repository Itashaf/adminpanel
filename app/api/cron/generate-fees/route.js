import { NextResponse } from 'next/server';
import { generateDueStudentFees } from '@/lib/fees';

// Vercel Cron (see vercel.json's "crons" entry, daily) — auto-generates any
// fee-structure term whose quarter start date has arrived, so an admin no
// longer has to remember to click "Generate Fees" once each quarter begins.
// Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` on
// scheduled invocations when that env var is set — verified here so this
// endpoint can't be triggered by an arbitrary outside request to
// mass-generate fees on demand.
export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results = await generateDueStudentFees();
    return NextResponse.json({ success: true, termsProcessed: results.length, results });
  } catch (err) {
    console.error('generate-fees cron failed', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
