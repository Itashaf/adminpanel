import { NextResponse } from 'next/server';
import { getCurrentUserInfo } from '@/lib/iam';
import { addReply } from '@/lib/support';
import { readJson } from '@/lib/http';

export async function POST(request, { params }) {
  const actor = await getCurrentUserInfo();
  if (!actor) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (actor.role === 'Parent') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  // A staff actor with no school would make the school-scoped queries below run
  // unscoped (a missing schoolId means "no filter"), so refuse instead.
  if (actor.role !== 'SuperAdmin' && !actor.schoolId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const { message, attachmentUrl } = await readJson(request);
  const isSuperAdmin = actor.role === 'SuperAdmin';

  try {
    const reply = await addReply(id, actor, message, {
      schoolId: isSuperAdmin ? null : actor.schoolId,
      isSuperAdmin,
      attachmentUrl,
    });
    return NextResponse.json({ reply });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
