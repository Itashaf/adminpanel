import { NextResponse } from 'next/server';
import { getNoticesPageForUser } from '@/lib/notices';
import { getCurrentUserInfo } from '@/lib/iam';

const MAX_PAGE_SIZE = 50;

// Paged variant of GET /api/notices for the web Notices page — that route (and
// /api/notices/paged, which the mobile app uses) stay untouched. Same
// visibility rule as the page: a Teacher sees 'All Staff', their own Class
// notices and anything addressed to them; admin tier and Accountant see every
// notice (see lib/notices.js's visibleNoticeWhere). Parents use their own
// /api/parent/notices.
export async function GET(request) {
  const currentUser = await getCurrentUserInfo();
  if (!currentUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }
  if (currentUser.role === 'Parent') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(Number(searchParams.get('page')) || 1, 1);
  const pageSize = Math.min(Math.max(Number(searchParams.get('pageSize')) || 10, 1), MAX_PAGE_SIZE);

  const result = await getNoticesPageForUser(currentUser, {
    search: searchParams.get('search') || '',
    audience: searchParams.get('audience') || '',
    className: searchParams.get('className') || '',
    priority: searchParams.get('priority') || '',
    page,
    pageSize,
  });
  return NextResponse.json(result);
}
