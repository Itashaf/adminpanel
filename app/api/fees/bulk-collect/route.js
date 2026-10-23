import { NextResponse } from 'next/server';
import { bulkCollectFullDue } from '@/lib/fees';
import { requirePermission } from '@/lib/rbac';
import { isIdList, isNonEmptyString } from '@/lib/http';
import { readJson } from '@/lib/http';

export async function POST(request) {
  const { user, error } = await requirePermission('fees.collect');
  if (error) return error;

  const { studentIds, method } = await readJson(request);

  if (!isIdList(studentIds) || !isNonEmptyString(method)) {
    return NextResponse.json({ error: 'Select between 1 and 500 students and a payment method.' }, { status: 400 });
  }

  try {
    const result = await bulkCollectFullDue(studentIds, method, user);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
