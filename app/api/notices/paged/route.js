import { NextResponse } from 'next/server';
import { getVisibleNoticesPage } from '@/lib/notices';
import { getCurrentUserInfo } from '@/lib/iam';

// Paginated variant of GET /api/notices — that route stays untouched (still
// returns the whole visible list as a plain array; changing its shape would
// break existing consumers), same convention as /api/students/paged next to
// GET /api/students. Only the mobile app's Notices feed uses this one.
export async function GET(request) {
  const currentUser = await getCurrentUserInfo();
  if (!currentUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const { notices, hasMore, total } = await getVisibleNoticesPage(currentUser, { page, pageSize: 10 });
  return NextResponse.json({ notices, hasMore, page, total });
}
