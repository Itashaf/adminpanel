import { NextResponse } from 'next/server';
import { getStudentFeeSummaries } from '@/lib/fees';

// This aggregates live payment data (called right after a collection) —
// never let Next.js treat it as a cacheable static route.
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const result = await getStudentFeeSummaries({
    academicSession: searchParams.get('session') || '',
    className: searchParams.get('class') || '',
    section: searchParams.get('section') || '',
    status: searchParams.get('status') || '',
    search: searchParams.get('search') || '',
    sortBy: searchParams.get('sortBy') || '',
    sortDir: searchParams.get('sortDir') || 'desc',
    page: Number(searchParams.get('page')) || 1,
    pageSize: Number(searchParams.get('pageSize')) || 10,
  });
  return NextResponse.json(result);
}
