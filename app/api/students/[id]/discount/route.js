import { NextResponse } from 'next/server';
import { setStandingDiscount, removeStandingDiscount } from '@/lib/fees';
import { requirePermission } from '@/lib/rbac';
import { readJson } from '@/lib/http';

// Standing discount lives on the Student row itself (Student.discountType/
// discountValue/discountReason), not StudentFee — students.update, not a
// fees.* key, matches what this route actually mutates.
export async function POST(request, { params }) {
  const { user, error } = await requirePermission('students.update');
  if (error) return error;

  const { id } = await params;
  try {
    const data = await readJson(request);
    const result = await setStandingDiscount(id, data, user);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { user, error } = await requirePermission('students.update');
  if (error) return error;

  const { id } = await params;
  try {
    const result = await removeStandingDiscount(id, user);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
