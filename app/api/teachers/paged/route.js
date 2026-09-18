import { NextResponse } from 'next/server';
import { getTeachersPage } from '@/lib/teachers';
import { requireSchoolAdmin } from '@/lib/iam';
import { resolveSchoolId } from '@/lib/auth/schoolContext';

// Real query-level pagination for the Teachers dashboard table — see
// lib/teachers.js's getTeachersPage. No existing consumer relies on a
// full-array GET /api/teachers response (unlike Students, this collection
// had no GET route at all before this), so this is the only one.
export async function GET(request) {
  const { error } = await requireSchoolAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || 10));

  const { teachers, total } = await getTeachersPage({
    schoolId: await resolveSchoolId(),
    page,
    pageSize,
    search: searchParams.get('search') || '',
    statusFilter: searchParams.get('status') || '',
    classFilter: searchParams.get('class') || '',
  });

  return NextResponse.json({ teachers, total, page, pageSize });
}
