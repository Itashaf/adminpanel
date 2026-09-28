import { NextResponse } from 'next/server';
import { approveMarks, rejectMarks, unlockMarks } from '@/lib/examMarks';
import { getCurrentUserInfo } from '@/lib/iam';
import { requirePermission } from '@/lib/rbac';

// POST /api/exams/schedules/[scheduleId]/verify — { action: 'approve' | 'reject' | 'unlock', reason?, studentId? }
// `studentId` narrows the action to just that one student's row instead of
// every mark in this class+section+subject. Admin-only — but Teacher also
// holds marks.update (for editing their OWN entered marks before submission,
// via the separate .../marks route's own scoping), so the permission check
// alone isn't enough here; same shared-key pattern as Students/Attendance/
// Timetable, explicit Teacher-block on top.
//
// approveMarks/rejectMarks/unlockMarks each call their own assertIsAdmin()
// internally, which checks currentUser.role (the legacy 'SchoolAdmin'/
// 'SuperAdmin' string) — the RBAC actor from requirePermission only has
// roleKey ('Admin'/'Principal'/...), so it's used here just for the
// Teacher-block; the actual legacy-shaped actor still gets passed into the
// lib functions below, unchanged.
export async function POST(request, { params }) {
  const { error: authError, user: rbacActor } = await requirePermission('marks.update');
  if (authError) return authError;
  if (rbacActor.roleKey === 'Teacher') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const actor = await getCurrentUserInfo();

  const { scheduleId } = await params;
  const { action, reason, studentId } = await request.json();

  try {
    let result;
    if (action === 'approve') {
      result = await approveMarks(scheduleId, actor, studentId || null);
    } else if (action === 'reject') {
      result = await rejectMarks(scheduleId, reason, actor, studentId || null);
    } else if (action === 'unlock') {
      result = await unlockMarks(scheduleId, actor, studentId || null);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
