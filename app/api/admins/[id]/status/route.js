import { NextResponse } from 'next/server';
import { updateAdminStatus } from '@/lib/admins';
import { requireSuperAdmin } from '@/lib/iam';

export async function PATCH(request, { params }) {
  const { error: authError } = await requireSuperAdmin();
  if (authError) return authError;

  const { id } = await params;
  const { status } = await request.json();

  if (!status) {
    return NextResponse.json({ error: 'Missing status' }, { status: 400 });
  }

  const admin = await updateAdminStatus(id, status);
  if (!admin) {
    return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
  }

  return NextResponse.json(admin);
}
