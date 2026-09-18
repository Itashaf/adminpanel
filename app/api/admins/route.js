import { NextResponse } from 'next/server';
import { getAllAdmins } from '@/lib/admins';
import { requireSuperAdmin } from '@/lib/iam';

export async function GET() {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const admins = await getAllAdmins();
  return NextResponse.json(admins);
}
