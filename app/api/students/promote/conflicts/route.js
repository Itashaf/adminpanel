import { NextResponse } from 'next/server';
import { getPromotionConflicts } from '@/lib/students';
import { requirePermission } from '@/lib/rbac';
import { resolveSchoolId } from '@/lib/auth/schoolContext';
import { readJson } from '@/lib/http';

// POST /api/students/promote/conflicts — { studentIds, toSession }. Read-
// only pre-check for PromoteStudentsExplorer.jsx's preview dialog (see
// lib/students.js's getPromotionConflicts) — never writes anything, same
// students.update gate as the promote screen itself.
export async function POST(request) {
  const { error } = await requirePermission('students.update');
  if (error) return error;

  const { studentIds = [], toSession } = await readJson(request);
  if (!toSession || !studentIds.length) return NextResponse.json([]);

  const schoolId = await resolveSchoolId();
  const conflicts = await getPromotionConflicts(schoolId, studentIds, toSession);
  return NextResponse.json(conflicts);
}
