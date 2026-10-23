import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requirePermission, clearRolePermissionCache } from '@/lib/rbac';
import { readJson } from '@/lib/http';

// Task 19 — full-replace: sets a role's permission set to exactly the
// given list (delete-then-recreate, same convention as this app's Fee
// Structure terms). `permissions.manage` is the guard, but the SuperAdmin
// role itself is hard-blocked below regardless of caller — Principal has
// permissions.manage (per the default mapping) but the spec is explicit
// that Principal must never manage Super Admin; without this, a Principal
// could quietly strip or rewrite what Super Admin can do.
export async function POST(request, { params }) {
  const { user, error } = await requirePermission('permissions.manage');
  if (error) return error;
  // Roles and their permission sets are shared by every school, so only the Super
  // Admin may change them: a Principal editing a role here would change it for
  // all schools (API-004).
  if (user.roleKey !== 'SuperAdmin') {
    return NextResponse.json({ error: 'Only the Super Admin can change role permissions.' }, { status: 403 });
  }

  const { id } = await params;
  const { permissionKeys } = await readJson(request);
  if (!Array.isArray(permissionKeys)) {
    return NextResponse.json({ error: 'permissionKeys must be an array' }, { status: 400 });
  }

  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 });

  if (role.key === 'SuperAdmin' && user.roleKey !== 'SuperAdmin') {
    return NextResponse.json({ error: 'Only Super Admin can edit the Super Admin role.' }, { status: 403 });
  }

  const permissions = await prisma.permission.findMany({ where: { key: { in: permissionKeys } } });
  if (permissions.length !== permissionKeys.length) {
    return NextResponse.json({ error: 'One or more permission keys do not exist.' }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId: id } }),
    prisma.rolePermission.createMany({ data: permissions.map((p) => ({ roleId: id, permissionId: p.id })) }),
  ]);

  clearRolePermissionCache();

  return NextResponse.json({ roleId: id, permissionKeys });
}
