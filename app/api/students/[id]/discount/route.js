import { NextResponse } from 'next/server';
import { setStandingDiscount, removeStandingDiscount } from '@/lib/fees';
import { requirePermission } from '@/lib/rbac';

// Standing discount lives on the Student row itself (Student.discountType/
// discountValue/discountReason), not StudentFee — students.update, not a
// fees.* key, matches what this route actually mutates.
export async function POST(request, { params }) {
  const { error } = await requirePermission('students.update');
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
  const { error } = await requirePermission('students.update');
  if (error) return error;

  const { id } = await params;
  try {
    const result = await removeStandingDiscount(id);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
