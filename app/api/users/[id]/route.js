import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requirePermission } from '@/lib/rbac';

// Task 21 — identity fields only (name/email/phone/status). Role changes go
// through PATCH /api/users/[id]/role instead — kept as a separate endpoint
// so "can this caller edit a user's name" and "can this caller move a user
// up the role hierarchy" are two different, independently-checked things,
// not one route where a role change could slip in alongside a name edit.
export async function PUT(request, { params }) {
  const { user, error } = await requirePermission('users.update');
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  if ('roleKey' in body || 'roleId' in body || 'role' in body) {
    return NextResponse.json({ error: 'Use PATCH /api/users/[id]/role to change role.' }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Never trust a school-scoped caller to edit a user outside their own
  // school — Super Admin (no school of their own) is the only exception.
  if (user.roleKey !== 'SuperAdmin' && target.schoolId !== user.schoolId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: body.name ?? target.name,
        email: body.email ? body.email.trim().toLowerCase() : target.email,
        phone: body.phone ?? target.phone,
        status: body.status ?? target.status,
      },
    });
    return NextResponse.json({ id: updated.id, name: updated.name, email: updated.email, phone: updated.phone, status: updated.status });
  } catch (err) {
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'A user with this email already exists in this school.' }, { status: 400 });
    }
    throw err;
  }
}
