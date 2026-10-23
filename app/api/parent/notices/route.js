import { NextResponse } from 'next/server';
import { requireParent } from '@/lib/iam';
import { getStudentById } from '@/lib/students';
import { getNoticesPageForStudent } from '@/lib/notices';

const MAX_PAGE_SIZE = 50;

// One page of the Parent portal's Notices for the active child — 'All
// Parents', that child's own class/section, and anything addressed to this
// parent account (see lib/notices.js's parentNoticeWhere).
export async function GET(request) {
  const { actor, error } = await requireParent();
  if (error) return error;

  const student = await getStudentById(actor.studentId, actor.schoolId);
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const page = Math.max(Number(searchParams.get('page')) || 1, 1);
  const pageSize = Math.min(Math.max(Number(searchParams.get('pageSize')) || 10, 1), MAX_PAGE_SIZE);

  const result = await getNoticesPageForStudent(student, actor.id, { page, pageSize });
  return NextResponse.json(result);
}
