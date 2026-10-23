import { NextResponse } from 'next/server';
import { reconcilePendingRazorpayPayments } from '@/lib/fees';
import { checkFeeAndPlacementConsistency } from '@/lib/consistency';

// Vercel Cron (see vercel.json, daily) — safety net for online payments whose
// browser callback and webhook both never arrived: asks Razorpay about every
// payment still PENDING after 30 minutes and records the ones that were
// captured. Then runs the read-only consistency checks (fee paid amounts vs payments, student
// placement vs enrollments) and returns what it found. Same CRON_SECRET bearer check as the other cron routes, and it
// fails closed when the secret is not configured.
export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await reconcilePendingRazorpayPayments();
    const consistency = await checkFeeAndPlacementConsistency().catch((err) => ({ error: err.message }));
    return NextResponse.json({ success: true, ...result, consistency });
  } catch (err) {
    console.error('reconcile-payments cron failed', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
