import { NextResponse } from 'next/server';
import { collectManualPayment } from '@/lib/fees';
import { requireSchoolAdmin } from '@/lib/iam';

export async function POST(request) {
  const { error } = await requireSchoolAdmin();
  if (error) return error;

  const { studentFeeId, method, amount } = await request.json();

  if (!studentFeeId || !method) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const result = await collectManualPayment({ studentFeeId, method, amount });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
