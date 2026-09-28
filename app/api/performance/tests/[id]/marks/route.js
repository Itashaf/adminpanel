import { NextResponse } from 'next/server';
import { getSubjectTestById, uploadSubjectTestMarks } from '@/lib/performance/subjectTests';
import { requirePermission } from '@/lib/rbac';

export async function GET(request, { params }) {
  const { error } = await requirePermission('performanceReports.view');
  if (error) return error;

  const { id } = await params;
  const test = await getSubjectTestById(id);
  if (!test) return NextResponse.json({ error: 'Test not found.' }, { status: 404 });
  return NextResponse.json(test.marks);
}

// Bulk upload — body is `{ rows }`, already parsed client-side from the
// uploaded Excel (same convention as POST /api/students/bulk-import).
export async function POST(request, { params }) {
  const { error } = await requirePermission('performanceReports.tests.manage');
  if (error) return error;

  const { id } = await params;
  const { rows } = await request.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No rows to import' }, { status: 400 });
  }

  try {
    const result = await uploadSubjectTestMarks(id, rows);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
