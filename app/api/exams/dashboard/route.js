import { NextResponse } from 'next/server';
import { getExamDashboardStats } from '@/lib/exams';
import { requirePermission } from '@/lib/rbac';

export async function GET() {
  const { error } = await requirePermission('exams.manage');
  if (error) return error;

  const stats = await getExamDashboardStats();
  return NextResponse.json(stats);
}
