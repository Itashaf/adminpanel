import { NextResponse } from 'next/server';
import { getMarksEntryProgress } from '@/lib/examMarks';
import { requirePermission } from '@/lib/rbac';

export async function GET(request, { params }) {
  const { id } = await params;
  const { error } = await requirePermission('exams.manage');
  if (error) return error;

  const progress = await getMarksEntryProgress(id);
  return NextResponse.json(progress);
}
