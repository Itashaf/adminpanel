import { NextResponse } from 'next/server';
import { bulkCreateStudents } from '@/lib/students';
import { generateFeesForNewStudent } from '@/lib/fees';
import { requirePermission } from '@/lib/rbac';
import { resolveSchoolId } from '@/lib/auth/schoolContext';
import { readJson } from '@/lib/http';
import { BULK_IMPORT_MAX_ROWS } from '@/lib/bulkImportColumns';

export async function POST(request) {
  const { error } = await requirePermission('students.create');
  if (error) return error;

  const { rows } = await readJson(request);

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No rows to import' }, { status: 400 });
  }

  if (rows.length > BULK_IMPORT_MAX_ROWS) {
    return NextResponse.json(
      { error: `This file has ${rows.length} students; import at most ${BULK_IMPORT_MAX_ROWS} at a time. Split the file and import it in parts.` },
      { status: 400 }
    );
  }

  const schoolId = await resolveSchoolId();
  const { imported, skipped } = await bulkCreateStudents(rows, schoolId);
  // Best-effort, one per imported student — see generateFeesForNewStudent's
  // own doc comment; never allowed to fail the import response.
  // Ten at a time: all of them at once could open more database connections than the pool has.
  for (let i = 0; i < imported.length; i += 10) {
    await Promise.all(imported.slice(i, i + 10).map((student) => generateFeesForNewStudent(schoolId, student)));
  }
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
