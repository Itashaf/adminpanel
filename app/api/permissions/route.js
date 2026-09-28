import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requirePermission } from '@/lib/rbac';

// Task 20 — the full permission catalog, grouped by module, for the Roles &
// Permissions UI's matrix. Read-only; the catalog itself (which keys exist)
// is fixed in prisma/rbacPermissions.js, not editable through this route —
// only which permissions a Role has is (see /api/roles/[id]/permissions).
export async function GET() {
  const { error } = await requirePermission('permissions.view');
  if (error) return error;

  const rows = await prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { key: 'asc' }] });
  const byModule = {};
  for (const row of rows) {
    if (!byModule[row.module]) byModule[row.module] = [];
    byModule[row.module].push({ key: row.key, label: row.label });
  }
  return NextResponse.json({ modules: byModule, total: rows.length });
}
