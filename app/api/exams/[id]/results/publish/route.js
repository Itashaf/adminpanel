import { NextResponse } from 'next/server';
import { publishExamResults, unpublishExamResults } from '@/lib/examResults';
import { getCurrentUserInfo } from '@/lib/iam';
import { requirePermission } from '@/lib/rbac';

// publishExamResults()/unpublishExamResults() each call assertIsAdmin()
// internally, checking currentUser.role — same reason as
// app/api/exams/[id]/results/route.js's POST, the legacy-shaped actor is
// what actually gets passed in below, not the RBAC one.
export async function POST(request, { params }) {
  const { error: authError } = await requirePermission('results.publish');
  if (authError) return authError;

  const actor = await getCurrentUserInfo();
  const { id } = await params;

  try {
    const results = await publishExamResults(id, actor);
    return NextResponse.json(results);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { error: authError } = await requirePermission('results.publish');
  if (authError) return authError;

  const actor = await getCurrentUserInfo();
  const { id } = await params;

  try {
    const results = await unpublishExamResults(id, actor);
    return NextResponse.json(results);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
