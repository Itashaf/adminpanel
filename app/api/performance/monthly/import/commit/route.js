import { NextResponse } from 'next/server';
import { commitMonthlyImport } from '@/lib/performance/bulkImport';
import { requirePermission } from '@/lib/rbac';
import { getCurrentUserInfo } from '@/lib/iam';
import { getCurrentUser } from '@/lib/currentUser';

export async function POST(request) {
  const { error } = await requirePermission('performanceReports.monthly.manage');
  if (error) return error;

  const { className, sectionName, academicSession, month, activities, holistic, remarks } = await request.json();
  if (!className || !sectionName || !academicSession || !month) {
    return NextResponse.json({ error: 'className, sectionName, academicSession and month are required.' }, { status: 400 });
  }

  const currentUser = (await getCurrentUserInfo()) || (await getCurrentUser());
  const result = await commitMonthlyImport(currentUser, { className, sectionName, academicSession, month }, { activities, holistic, remarks });
  return NextResponse.json(result);
}
