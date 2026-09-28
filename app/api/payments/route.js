import { NextResponse } from 'next/server';
import { getPayments } from '@/lib/fees';
import { requirePermission } from '@/lib/rbac';

// fees.view is also held by Parent (own child only) — this is the
// school-wide payment history listing, needs the same explicit block.
export async function GET(request) {
  const { user, error } = await requirePermission('fees.view');
  if (error) return error;
  if (user.roleKey === 'Parent') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const result = await getPayments({
    studentId: searchParams.get('studentId') || '',
    method: searchParams.get('method') || '',
    status: searchParams.get('status') || '',
    page: Number(searchParams.get('page')) || 1,
    pageSize: Number(searchParams.get('pageSize')) || 20,
  });
  return NextResponse.json(result);
}
