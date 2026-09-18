import { NextResponse } from 'next/server';
import { publishExamResults, unpublishExamResults } from '@/lib/examResults';
import { requireSchoolAdmin } from '@/lib/iam';

export async function POST(request, { params }) {
  const { error: authError, actor } = await requireSchoolAdmin();
  if (authError) return authError;

  const { id } = await params;

  try {
    const results = await publishExamResults(id, actor);
    return NextResponse.json(results);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { error: authError, actor } = await requireSchoolAdmin();
  if (authError) return authError;

  const { id } = await params;

  try {
    const results = await unpublishExamResults(id, actor);
    return NextResponse.json(results);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
