import { NextResponse } from 'next/server';
import { getMarksEntryProgress } from '@/lib/examMarks';
import { getCurrentUserInfo } from '@/lib/iam';

export async function GET(request, { params }) {
  const { id } = await params;
  const currentUser = await getCurrentUserInfo();
  if (!currentUser || (currentUser.role !== 'SchoolAdmin' && currentUser.role !== 'SuperAdmin')) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const progress = await getMarksEntryProgress(id);
  return NextResponse.json(progress);
}
