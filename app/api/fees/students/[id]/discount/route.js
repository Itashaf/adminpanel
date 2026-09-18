import { NextResponse } from 'next/server';
import { applyFeeDiscount, removeFeeDiscount } from '@/lib/fees';
import { requireSchoolAdmin } from '@/lib/iam';

export async function POST(request, { params }) {
  const { error } = await requireSchoolAdmin();
  if (error) return error;

  const { id } = await params;
  try {
    const data = await request.json();
    const fee = await applyFeeDiscount(id, data);
    return NextResponse.json(fee);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { error } = await requireSchoolAdmin();
  if (error) return error;

  const { id } = await params;
  try {
    const fee = await removeFeeDiscount(id);
    return NextResponse.json(fee);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
