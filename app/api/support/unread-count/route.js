import { NextResponse } from 'next/server';
import { getCurrentUserInfo } from '@/lib/iam';
import { getSchoolUnreadSupportCount, getSuperAdminUnreadSupportCount } from '@/lib/support';

// Sidebar.jsx's / SuperAdminNav.jsx's "Support" badge count.
export async function GET() {
  const actor = await getCurrentUserInfo();
  if (!actor) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (actor.role === 'Parent') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  // A staff actor with no school would make the school-scoped queries below run
  // unscoped (a missing schoolId means "no filter"), so refuse instead.
  if (actor.role !== 'SuperAdmin' && !actor.schoolId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const count =
    actor.role === 'SuperAdmin' ? await getSuperAdminUnreadSupportCount() : await getSchoolUnreadSupportCount(actor.schoolId);
  return NextResponse.json({ count });
}
