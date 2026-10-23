import { NextResponse } from 'next/server';
import { getStudentsForPromotion, promoteInTx, retainInTx } from '@/lib/students';
import prisma from '@/lib/db';
import { requirePermission } from '@/lib/rbac';
import { resolveSchoolId } from '@/lib/auth/schoolContext';
import { readJson } from '@/lib/http';

// GET /api/students/promote?session=&class=&section= — the roster an admin
// picks from before promoting. Gated on students.update (same as the
// mutation itself), not students.view — this is a management tool, not a
// read-only listing.
export async function GET(request) {
  const { error } = await requirePermission('students.update');
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const academicSession = searchParams.get('session');
  const className = searchParams.get('class') || '';
  const sectionName = searchParams.get('section') || '';

  if (!academicSession) {
    return NextResponse.json({ error: 'session is required' }, { status: 400 });
  }

  const schoolId = await resolveSchoolId();
  const students = await getStudentsForPromotion(schoolId, { academicSession, className, sectionName });
  return NextResponse.json(students);
}

// POST /api/students/promote — { promoteIds, retainIds, toSession, toClass,
// toSection }. `promoteIds` move to toClass/toSection; `retainIds` (failed/
// held-back students) move into toSession too but keep their own current
// class/section — see lib/students.js's retainStudentsInSession for why
// they still need to move sessions at all.
export async function POST(request) {
  const { user, error } = await requirePermission('students.update');
  if (error) return error;

  const { promoteIds = [], retainIds = [], toSession, toClass, toSection } = await readJson(request);
  const hasPromote = promoteIds.length > 0;
  const hasRetain = retainIds.length > 0;

  if (!toSession || (!hasPromote && !hasRetain)) {
    return NextResponse.json({ error: 'toSession and at least one student are required' }, { status: 400 });
  }
  if (hasPromote && !toClass) {
    return NextResponse.json({ error: 'toClass is required to promote students' }, { status: 400 });
  }

  if (!Array.isArray(promoteIds) || !Array.isArray(retainIds)) {
    return NextResponse.json({ error: 'promoteIds and retainIds must be lists' }, { status: 400 });
  }
  // A student cannot be both promoted and held back.
  const retainSet = new Set(retainIds);
  if (promoteIds.some((id) => retainSet.has(id))) {
    return NextResponse.json({ error: 'A student cannot be both promoted and retained.' }, { status: 400 });
  }

  const schoolId = await resolveSchoolId();
  try {
    // One transaction for both groups: if either fails nobody is moved (they used to
    // run separately, so one group could be moved while the other failed).
    const { promoted, retained } = await prisma.$transaction(
      async (tx) => ({
        promoted: hasPromote ? await promoteInTx(tx, schoolId, promoteIds, { toSession, toClass, toSection }, user) : { count: 0, unpaidFeeStudentCount: 0 },
        retained: hasRetain ? await retainInTx(tx, schoolId, retainIds, toSession, user) : { count: 0, unpaidFeeStudentCount: 0 },
      }),
      { timeout: 60000 }
    );
    return NextResponse.json({
      promotedCount: promoted.count,
      retainedCount: retained.count,
      unpaidFeeStudentCount: promoted.unpaidFeeStudentCount + retained.unpaidFeeStudentCount,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed to promote students' }, { status: 400 });
  }
}
