import { NextResponse } from 'next/server';
import { applyFeeDiscount, removeFeeDiscount } from '@/lib/fees';
import { requirePermission } from '@/lib/rbac';
import { readJson } from '@/lib/http';

export async function POST(request, { params }) {
  const { user, error } = await requirePermission('fees.update');
  if (error) return error;

  const { id } = await params;
  try {
    const data = await readJson(request);
    const fee = await applyFeeDiscount(id, data, user);
    return NextResponse.json(fee);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { user, error } = await requirePermission('fees.update');
  if (error) return error;

  const { id } = await params;
  try {
    const fee = await removeFeeDiscount(id, user);
    return NextResponse.json(fee);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
