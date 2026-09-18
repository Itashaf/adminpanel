import { NextResponse } from 'next/server';
import { getAdminById } from '@/lib/admins';
import { requireSuperAdmin } from '@/lib/iam';

export async function GET(request, { params }) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const { id } = await params;
  const admin = await getAdminById(id);
  if (!admin) {
    return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
  }
  return NextResponse.json(admin);
}
