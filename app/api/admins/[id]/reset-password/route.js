import { NextResponse } from 'next/server';
import { resetAdminPassword } from '@/lib/admins';
import { requireSuperAdmin } from '@/lib/iam';

export async function POST(request, { params }) {
  const { error: authError } = await requireSuperAdmin();
  if (authError) return authError;

  const { id } = await params;

  const admin = await resetAdminPassword(id);
  if (!admin) {
    return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
  }

  return NextResponse.json(admin);
}
