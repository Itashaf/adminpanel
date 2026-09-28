import { NextResponse } from 'next/server';
import { applyStandingDiscountToPendingFees } from '@/lib/fees';
import { requirePermission } from '@/lib/rbac';

export async function POST(request, { params }) {
  const { error } = await requirePermission('students.update');
  if (error) return error;

  const { id } = await params;
  try {
    const result = await applyStandingDiscountToPendingFees(id);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
