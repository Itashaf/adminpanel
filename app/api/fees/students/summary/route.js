import { NextResponse } from 'next/server';
import { getStudentFeeSummaries } from '@/lib/fees';
import { requireStaffPermission } from '@/lib/rbac';

// This aggregates live payment data (called right after a collection) —
// never let Next.js treat it as a cacheable static route.
export const dynamic = 'force-dynamic';

// Matches StudentFeesExplorer's CSV export chunk size — it pages through
// instead of asking for one huge page.
const MAX_PAGE_SIZE = 500;

// fees.view is also held by Parent (own child only) — this is the
// school-wide per-student fee table, needs the same explicit block.
export async function GET(request) {
  const { user, error } = await requireStaffPermission('fees.view');
  if (error) return error;
  if (user.roleKey === 'Parent') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const result = await getStudentFeeSummaries({
    academicSession: searchParams.get('session') || '',
    className: searchParams.get('class') || '',
    section: searchParams.get('section') || '',
    status: searchParams.get('status') || '',
    search: searchParams.get('search') || '',
    sortBy: searchParams.get('sortBy') || '',
    sortDir: searchParams.get('sortDir') || 'desc',
    page: Math.max(Number(searchParams.get('page')) || 1, 1),
    pageSize: Math.min(Math.max(Number(searchParams.get('pageSize')) || 10, 1), MAX_PAGE_SIZE),
  });
  return NextResponse.json(result);
}
