import { NextResponse } from 'next/server';
import { getFeesStats } from '@/lib/fees';
import { requirePermission } from '@/lib/rbac';

// Called right after a collection (single or bulk) to resync the "Amount
// Collected"/"Pending Amount" cards against the real, authoritative
// aggregate — never let Next.js treat it as a cacheable static route.
export const dynamic = 'force-dynamic';

// fees.view is also held by Parent (own child only) — school-wide
// aggregate stats need an explicit block on top, same as structures above.
export async function GET() {
  const { user, error } = await requirePermission('fees.view');
  if (error) return error;
  if (user.roleKey === 'Parent') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const stats = await getFeesStats();
  return NextResponse.json(stats);
}
