import { NextResponse } from 'next/server';
import { getCurrentUserInfo } from '@/lib/iam';
import { getSchoolTickets, getAllTickets, createTicket } from '@/lib/support';
import { readJson } from '@/lib/http';

// GET /api/support/tickets — a SuperAdmin sees every school's tickets
// (?status= filters), everyone else sees only their own school's. Parent is
// explicitly excluded — Support is a staff-only feature (see
// components/parent/ParentSidebar.jsx, which has no Support entry at all).
export async function GET(request) {
  const actor = await getCurrentUserInfo();
  if (!actor) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (actor.role === 'Parent') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  // A staff actor with no school would make the school-scoped queries below run
  // unscoped (a missing schoolId means "no filter"), so refuse instead.
  if (actor.role !== 'SuperAdmin' && !actor.schoolId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (actor.role === 'SuperAdmin') {
    const { searchParams } = new URL(request.url);
    const tickets = await getAllTickets({ status: searchParams.get('status') || '' });
    return NextResponse.json({ tickets });
  }

  const tickets = await getSchoolTickets(actor.schoolId);
  return NextResponse.json({ tickets });
}

export async function POST(request) {
  const actor = await getCurrentUserInfo();
  if (!actor) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (actor.role === 'Parent' || actor.role === 'SuperAdmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // A staff actor with no school would make the school-scoped queries below run
  // unscoped (a missing schoolId means "no filter"), so refuse instead.
  if (actor.role !== 'SuperAdmin' && !actor.schoolId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { subject, category, priority, message, attachmentUrl } = await readJson(request);
  try {
    const ticket = await createTicket(actor.schoolId, actor, { subject, category, priority, message, attachmentUrl });
    return NextResponse.json({ ticket });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
