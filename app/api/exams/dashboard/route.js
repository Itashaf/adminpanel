import { NextResponse } from 'next/server';
import { getExamDashboardStats } from '@/lib/exams';
import { getCurrentUserInfo } from '@/lib/iam';

export async function GET() {
  const currentUser = await getCurrentUserInfo();
  if (!currentUser || (currentUser.role !== 'SchoolAdmin' && currentUser.role !== 'SuperAdmin')) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const stats = await getExamDashboardStats();
  return NextResponse.json(stats);
}
