import { NextResponse } from 'next/server';
import { getExamAuditLog } from '@/lib/examAuditLog';
import { getCurrentUserInfo } from '@/lib/iam';

// GET /api/exams/[id]/audit-log — admin-only history of everything that
// happened to this exam (created, published, marks approved/rejected/
// unlocked, result generated/published/unpublished), newest first.
export async function GET(request, { params }) {
  const { id } = await params;
  const currentUser = await getCurrentUserInfo();
  if (!currentUser || (currentUser.role !== 'SchoolAdmin' && currentUser.role !== 'SuperAdmin')) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const rows = await getExamAuditLog(id);
  return NextResponse.json(rows);
}
