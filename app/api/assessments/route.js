import { NextResponse } from 'next/server';
import { getCurrentUserInfo } from '@/lib/iam';
import { getAssessmentsForClass } from '@/lib/studentAssessments';

// GET /api/assessments?class=&section=&session=&month=&year= — the
// Assessment Dashboard's roster + status list for one class+section+month.
// Real session required (see this app's other routes for why the old
// toggle-fallback pattern was a live unauthenticated-access bug) — works
// for both a real Teacher (scoped to their own class inside
// getAssessmentsForClass) and a real SchoolAdmin (unrestricted).
export async function GET(request) {
  const currentUser = await getCurrentUserInfo();
  if (!currentUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const className = searchParams.get('class');
  const sectionName = searchParams.get('section');
  const academicSession = searchParams.get('session');
  const month = Number(searchParams.get('month'));
  const year = Number(searchParams.get('year'));
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || 20));
  const search = searchParams.get('search') || '';
  const statusFilter = searchParams.get('status') || 'all';
  const sortOrder = searchParams.get('sort') === 'desc' ? 'desc' : 'asc';

  if (!className || !sectionName || !academicSession || !month || !year) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const result = await getAssessmentsForClass(currentUser, {
      className,
      sectionName,
      academicSession,
      month,
      year,
      page,
      pageSize,
      search,
      statusFilter,
      sortOrder,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}
