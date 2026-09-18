import { NextResponse } from 'next/server';
import { updateAdminPermissions } from '@/lib/admins';

export async function PATCH(request, { params }) {
  const { id } = await params;
  const { permissions } = await request.json();

  if (!permissions) {
    return NextResponse.json({ error: 'Missing permissions' }, { status: 400 });
  }

  const admin = await updateAdminPermissions(id, permissions);
  if (!admin) {
    return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
  }

  return NextResponse.json(admin);
}
