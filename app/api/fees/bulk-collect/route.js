import { NextResponse } from 'next/server';
import { bulkCollectFullDue } from '@/lib/fees';
import { requireSchoolAdmin } from '@/lib/iam';

export async function POST(request) {
  const { error } = await requireSchoolAdmin();
  if (error) return error;

  const { studentIds, method } = await request.json();

  if (!Array.isArray(studentIds) || studentIds.length === 0 || !method) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const result = await bulkCollectFullDue(studentIds, method);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
