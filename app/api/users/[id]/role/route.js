import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requirePermission, getRoleByKey, assertCanAssignRole } from '@/lib/rbac';

// Task 22 — role reassignment, the actual hierarchy enforcement point.
// Every "user cannot..." bullet from the spec's Security Requirements that
// applies to role assignment is checked here, server-side, in this order:
export async function PATCH(request, { params }) {
  const { user, error } = await requirePermission('users.update');
  if (error) return error;

  const { id } = await params;
  const { roleKey } = await request.json();
  if (!roleKey) return NextResponse.json({ error: 'Missing roleKey' }, { status: 400 });

  // 1. Cannot change their own role.
  if (id === user.id) {
    return NextResponse.json({ error: 'You cannot change your own role.' }, { status: 403 });
  }

  const target = await prisma.user.findUnique({
    where: { id },
    include: { teacherProfile: true, parentProfile: true, schoolAdminOf: true, superAdminOf: true },
  });
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // 2. Cannot access/modify another school's data.
  if (user.roleKey !== 'SuperAdmin' && target.schoolId !== user.schoolId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 3. Cannot assign a role above their own authority — the actual
  // hierarchy check, never inferred from a hidden frontend option.
  try {
    assertCanAssignRole(user.roleKey, roleKey);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }

  // 4. Data-integrity guard beyond the spec's own list: a user whose legacy
  // profile (Teacher's classes/subjects, ParentAccount's linked children)
  // assumes a specific role can't be silently reassigned away from it —
  // that data would become meaningless, not just unused. The platform
  // Super Admin's own role can never be reassigned by anyone.
  if (target.superAdminOf) {
    return NextResponse.json({ error: 'The platform Super Admin\'s role cannot be changed.' }, { status: 400 });
  }
  if (target.teacherProfile && roleKey !== 'Teacher') {
    return NextResponse.json({ error: 'This user has a Teacher profile and cannot be reassigned away from Teacher.' }, { status: 400 });
  }
  if (target.parentProfile && roleKey !== 'Parent') {
    return NextResponse.json({ error: 'This user has linked children and cannot be reassigned away from Parent.' }, { status: 400 });
  }
  if (target.schoolAdminOf && ['Teacher', 'Parent', 'SuperAdmin'].includes(roleKey)) {
    return NextResponse.json({ error: 'This user has an Admin account and cannot be reassigned to that role.' }, { status: 400 });
  }

  const role = await getRoleByKey(roleKey);
  if (!role) return NextResponse.json({ error: 'Unknown role' }, { status: 400 });

  const updated = await prisma.user.update({ where: { id }, data: { roleId: role.id } });
  return NextResponse.json({ id: updated.id, roleKey });
}
