import { NextResponse } from 'next/server';
import { getTeacherById } from '@/lib/teachers';
import { requirePermission } from '@/lib/rbac';
import { resolveSchoolId } from '@/lib/auth/schoolContext';

// GET /api/teachers/[id]/profile — the teacher profile shown in the mobile admin app. Same
// getTeacherById the web /dashboard/teachers/[id] page uses, minus Aadhaar, PAN, bank details,
// documents, parents and login data, which the app never shows.
export async function GET(request, { params }) {
  const { error } = await requirePermission('teachers.view');
  if (error) return error;

  const { id } = await params;
  const teacher = await getTeacherById(id, await resolveSchoolId());
  if (!teacher) {
    return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
  }

  const {
    aadhaarNumber, aadhaarDocumentName, aadhaarDocumentUrl, panNumber, bankDetails,
    documents, father, mother, guardian, loginAccess, ...profile
  } = teacher;
  return NextResponse.json(profile);
}
