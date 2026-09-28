import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requirePermission } from '@/lib/rbac';

// Task 18 — the fixed 6-role catalog (RoleKey enum), each with its
// permission and assigned-user counts, for the Roles & Permissions page's
// role list.
export async function GET() {
  const { error } = await requirePermission('roles.view');
  if (error) return error;

  const roles = await prisma.role.findMany({
    orderBy: { createdAt: 'asc' },
    include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } },
  });
  return NextResponse.json(
    roles.map((r) => ({
      id: r.id,
      key: r.key,
      name: r.name,
      isSystem: r.isSystem,
      userCount: r._count.users,
      permissionKeys: r.permissions.map((rp) => rp.permission.key),
    }))
  );
}

// No custom roles today — RoleKey is a fixed 6-value enum (see
// prisma/schema.prisma's comment on it), so there's nothing a POST here
// could create. Kept as a real route (not omitted) so the Roles &
// Permissions UI's "Create Role" affordance, if it exists, gets a clear
// answer instead of a raw 404.
export async function POST() {
  const { error } = await requirePermission('roles.manage');
  if (error) return error;
  return NextResponse.json(
    { error: 'Custom roles are not supported. The platform uses a fixed 6-role set — edit an existing role\'s permissions instead.' },
    { status: 400 }
  );
}
