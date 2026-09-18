import { NextResponse } from 'next/server';
import { updateAdminStatus } from '@/lib/admins';

export async function PATCH(request, { params }) {
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
