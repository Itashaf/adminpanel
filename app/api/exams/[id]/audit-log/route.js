import { NextResponse } from 'next/server';
import { getExamAuditLog } from '@/lib/examAuditLog';
import { requirePermission } from '@/lib/rbac';

// GET /api/exams/[id]/audit-log — admin-only history of everything that
// happened to this exam (created, published, marks approved/rejected/
// unlocked, result generated/published/unpublished), newest first.
export async function GET(request, { params }) {
  const { id } = await params;
  const { error } = await requirePermission('exams.manage');
  if (error) return error;

  const rows = await getExamAuditLog(id);
  return NextResponse.json(rows);
}
