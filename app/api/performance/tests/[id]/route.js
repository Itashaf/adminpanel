import { NextResponse } from 'next/server';
import { getSubjectTestById } from '@/lib/performance/subjectTests';
import { requirePermission } from '@/lib/rbac';

export async function GET(request, { params }) {
  const { error } = await requirePermission('performanceReports.view');
  if (error) return error;

  const { id } = await params;
  const test = await getSubjectTestById(id);
  if (!test) return NextResponse.json({ error: 'Test not found.' }, { status: 404 });
  return NextResponse.json(test);
}
