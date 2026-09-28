import { NextResponse } from 'next/server';
import { previewMonthlyImport } from '@/lib/performance/bulkImport';
import { requirePermission } from '@/lib/rbac';

export async function POST(request) {
  const { error } = await requirePermission('performanceReports.monthly.manage');
  if (error) return error;

  const { className, sectionName, academicSession, activities, holistic, remarks } = await request.json();
  if (!className || !sectionName || !academicSession) {
    return NextResponse.json({ error: 'className, sectionName and academicSession are required.' }, { status: 400 });
  }

  const { valid, ...preview } = await previewMonthlyImport({ className, sectionName, academicSession }, { activities, holistic, remarks });
  return NextResponse.json(preview);
}
