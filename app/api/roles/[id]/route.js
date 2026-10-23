import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requirePermission } from '@/lib/rbac';
import { readJson } from '@/lib/http';

// Task 18 — rename only. `key` (the RoleKey enum value the whole hierarchy/
// permission-default system is keyed off) is never editable through this
// route — only the human-facing `name` is.
export async function PUT(request, { params }) {
  const { user, error } = await requirePermission('roles.manage');
  if (error) return error;
  // Roles and their permission sets are shared by every school, so only the Super
  // Admin may change them: a Principal editing a role here would change it for
  // all schools (API-004).
  if (user.roleKey !== 'SuperAdmin') {
    return NextResponse.json({ error: 'Only the Super Admin can edit roles.' }, { status: 403 });
  }

  const { id } = await params;
  const { name } = await readJson(request);
  if (!name) {
    return NextResponse.json({ error: 'Missing name' }, { status: 400 });
  }

  try {
    const role = await prisma.role.update({ where: { id }, data: { name } });
    return NextResponse.json(role);
  } catch (err) {
    if (err?.code === 'P2025') return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    throw err;
  }
}

// Every role is system-seeded (isSystem: true) and referenced by User rows
// across every school — nothing to safely delete. Real route, real answer,
// same convention as POST /api/roles above.
export async function DELETE() {
  const { error } = await requirePermission('roles.manage');
  if (error) return error;
  return NextResponse.json({ error: 'System roles cannot be deleted.' }, { status: 400 });
}
