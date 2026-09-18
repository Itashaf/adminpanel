import { NextResponse } from 'next/server';
import { resetAdminPassword } from '@/lib/admins';

export async function POST(request, { params }) {
  const { id } = await params;

  const admin = await resetAdminPassword(id);
  if (!admin) {
    return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
  }

  return NextResponse.json(admin);
}
