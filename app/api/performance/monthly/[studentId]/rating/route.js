import { NextResponse } from 'next/server';
import { setOverallRating } from '@/lib/performance/monthlyReports';
import { requirePermission } from '@/lib/rbac';
import { getCurrentUserInfo } from '@/lib/iam';
import { getCurrentUser } from '@/lib/currentUser';
import { readJson } from '@/lib/http';

export async function PUT(request, { params }) {
  const { error } = await requirePermission('performanceReports.monthly.manage');
  if (error) return error;

  const { studentId } = await params;
  const { academicSession, month, overallRating } = await readJson(request);
  if (!academicSession || !month) {
    return NextResponse.json({ error: 'academicSession and month are required.' }, { status: 400 });
  }

  const currentUser = (await getCurrentUserInfo()) || (await getCurrentUser());
  try {
    const report = await setOverallRating(currentUser, studentId, academicSession, month, overallRating);
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
