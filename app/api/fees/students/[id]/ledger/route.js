import { NextResponse } from 'next/server';
import { getPaymentLedger } from '@/lib/fees';
import { getCurrentUserInfo } from '@/lib/iam';

export async function GET(request, { params }) {
  const { id } = await params;

  // Same Parent-ownership guard as the sibling /api/fees/student/[studentId]
  // route — without it, any studentId in the URL returned that student's
  // full payment history/receipts to whoever asked.
  const actor = await getCurrentUserInfo();
  if (actor?.role === 'Parent' && actor.studentId !== id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const ledger = await getPaymentLedger(id);
  return NextResponse.json(ledger);
}
