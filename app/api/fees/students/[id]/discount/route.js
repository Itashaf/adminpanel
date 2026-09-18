import { NextResponse } from 'next/server';
import { applyFeeDiscount, removeFeeDiscount } from '@/lib/fees';

export async function POST(request, { params }) {
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
  const { id } = await params;
  try {
    const fee = await removeFeeDiscount(id);
    return NextResponse.json(fee);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
