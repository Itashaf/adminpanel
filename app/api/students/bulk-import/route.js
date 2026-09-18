import { NextResponse } from 'next/server';
import { bulkCreateStudents } from '@/lib/students';
import { requireSchoolAdmin } from '@/lib/iam';
import { resolveSchoolId } from '@/lib/auth/schoolContext';

export async function POST(request) {
  const { error } = await requireSchoolAdmin();
  if (error) return error;

  const { rows } = await request.json();

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No rows to import' }, { status: 400 });
  }

  const { imported, skipped } = await bulkCreateStudents(rows, await resolveSchoolId());
  return NextResponse.json({
    importedCount: imported.length,
    // Full decorated student records (not just id/admissionId) — the
    // caller (StudentsExplorer) appends these straight into its local
    // list, same optimistic-update convention as every other mutation
    // here, so it needs the same shape StudentsTable already renders.
    imported,
    skipped,
  });
}
