import { NextResponse } from 'next/server';
import { getHomeworkPageForUser } from '@/lib/homework';
import { getCurrentUserInfo } from '@/lib/iam';

const MAX_PAGE_SIZE = 50;

// Paged variant of GET /api/homework for the web Homework page — that route
// stays untouched (still returns the whole visible list as a plain array, which
// the mobile app depends on). Same visibility rule: a Teacher only ever gets
// homework inside their own class scope (enforced in the query itself, see
// lib/homework.js's visibleHomeworkWhere). Accountant has no Homework access,
// same as the page.
export async function GET(request) {
  const currentUser = await getCurrentUserInfo();
  if (!currentUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }
  if (currentUser.roleKey === 'Accountant' || currentUser.role === 'Parent') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(Number(searchParams.get('page')) || 1, 1);
  const pageSize = Math.min(Math.max(Number(searchParams.get('pageSize')) || 10, 1), MAX_PAGE_SIZE);

  const result = await getHomeworkPageForUser(currentUser, {
    className: searchParams.get('class') || '',
    section: searchParams.get('section') || '',
    subject: searchParams.get('subject') || '',
    search: searchParams.get('q') || '',
    sort: searchParams.get('sort') === 'oldest' ? 'oldest' : 'latest',
    page,
    pageSize,
  });
  return NextResponse.json(result);
}
