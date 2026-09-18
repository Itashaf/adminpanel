import { NextResponse } from 'next/server';
import { getFeesStats } from '@/lib/fees';

// Called right after a collection (single or bulk) to resync the "Amount
// Collected"/"Pending Amount" cards against the real, authoritative
// aggregate — never let Next.js treat it as a cacheable static route.
export const dynamic = 'force-dynamic';

export async function GET() {
  const stats = await getFeesStats();
  return NextResponse.json(stats);
}
