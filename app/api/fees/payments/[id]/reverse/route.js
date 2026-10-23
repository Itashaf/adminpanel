import { NextResponse } from 'next/server';
import { reversePayment } from '@/lib/fees';
import { requirePermission } from '@/lib/rbac';
import { readJson } from '@/lib/http';

// POST /api/fees/payments/[id]/reverse — { reason }. Cancels a manually collected payment and puts
// the amount back on the fee as due. Needs the fees.refund permission.
export async function POST(request, { params }) {
  const { user, error } = await requirePermission('fees.refund');
  if (error) return error;

  const { id } = await params;
  try {
    const { reason } = await readJson(request);
    const result = await reversePayment({ paymentId: id, reason, actor: user });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
