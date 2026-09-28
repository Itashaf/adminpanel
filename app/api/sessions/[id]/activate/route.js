import { NextResponse } from 'next/server';
import { setActiveSession } from '@/lib/academicSessions';
import { requirePermission } from '@/lib/rbac';

export async function PATCH(request, { params }) {
  const { error: authError } = await requirePermission('settings.update');
  if (authError) return authError;

  const { id } = await params;

  const session = await setActiveSession(id);
  if (!session) {
    return NextResponse.json({ error: 'Academic session not found' }, { status: 404 });
  }

  return NextResponse.json(session);
}
