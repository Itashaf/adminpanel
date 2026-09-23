import { NextResponse } from 'next/server';
import { getPayments } from '@/lib/fees';
import { requireSchoolAdmin } from '@/lib/iam';

export async function GET(request) {
  const { error } = await requireSchoolAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const result = await getPayments({
    studentId: searchParams.get('studentId') || '',
    method: searchParams.get('method') || '',
    status: searchParams.get('status') || '',
    page: Number(searchParams.get('page')) || 1,
    pageSize: Number(searchParams.get('pageSize')) || 20,
  });
  return NextResponse.json(result);
}
