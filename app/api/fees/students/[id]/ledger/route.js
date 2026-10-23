import { NextResponse } from 'next/server';
import { getPaymentLedger } from '@/lib/fees';
import { getCurrentUserInfo } from '@/lib/iam';
import { requirePermission } from '@/lib/rbac';

export async function GET(request, { params }) {
  const { id } = await params;

  // Same Parent-ownership guard as the sibling /api/fees/student/[studentId]
  // route — without it, any studentId in the URL returned that student's
  // full payment history/receipts to whoever asked.
  const actor = await getCurrentUserInfo();
  if (!actor) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  if (actor.role === 'Parent') {
    if (actor.studentId !== id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } else {
    const { error: authError } = await requirePermission('fees.view');
    if (authError) return authError;
  }

  const ledger = await getPaymentLedger(id);
  return NextResponse.json(ledger);
}
