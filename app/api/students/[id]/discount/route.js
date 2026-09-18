import { NextResponse } from 'next/server';
import { setStandingDiscount, removeStandingDiscount } from '@/lib/fees';
import { requireSchoolAdmin } from '@/lib/iam';

export async function POST(request, { params }) {
  const { error } = await requireSchoolAdmin();
  if (error) return error;

  const { id } = await params;
  try {
    const data = await request.json();
    const result = await setStandingDiscount(id, data);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { error } = await requireSchoolAdmin();
  if (error) return error;

  const { id } = await params;
  try {
    const result = await removeStandingDiscount(id);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
