import { NextResponse } from 'next/server';
import { collectManualPayment } from '@/lib/fees';
import { requirePermission } from '@/lib/rbac';
import { isNonEmptyString } from '@/lib/http';
import { readJson } from '@/lib/http';

export async function POST(request) {
  const { user, error } = await requirePermission('fees.collect');
  if (error) return error;

  const { studentFeeId, method, amount } = await readJson(request);

  if (!isNonEmptyString(studentFeeId) || !isNonEmptyString(method)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  // amount is optional (blank = the full remaining due); when given it must be a whole number of rupees
  if (amount !== undefined && amount !== null && amount !== '' && !(Number.isInteger(Number(amount)) && Number(amount) > 0)) {
    return NextResponse.json({ error: 'Amount must be a whole number greater than zero.' }, { status: 400 });
  }

  try {
    const result = await collectManualPayment({ studentFeeId, method, amount, actor: user });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
