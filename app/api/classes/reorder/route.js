import { NextResponse } from 'next/server';
import { reorderClasses } from '@/lib/classes';
import { requirePermission } from '@/lib/rbac';

// PATCH /api/classes/reorder — drag-to-reorder drop in the Classes &
// Sections list (ClassesGrid.jsx). Body: { academicSession, orderedIds }.
export async function PATCH(request) {
  const { error: authError } = await requirePermission('classes.manage');
  if (authError) return authError;

  const { academicSession, orderedIds } = await request.json();
  if (!academicSession || !Array.isArray(orderedIds) || orderedIds.length === 0) {
    return NextResponse.json({ error: 'academicSession and a non-empty orderedIds array are required' }, { status: 400 });
  }

  await reorderClasses(academicSession, orderedIds);
  return NextResponse.json({ success: true });
}
