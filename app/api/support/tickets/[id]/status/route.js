import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/iam';
import { updateTicketStatus } from '@/lib/support';
import { readJson } from '@/lib/http';

export async function PATCH(request, { params }) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const { id } = await params;
  const { status } = await readJson(request);
  try {
    const ticket = await updateTicketStatus(id, status);
    return NextResponse.json({ ticket });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
