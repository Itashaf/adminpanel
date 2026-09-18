import { NextResponse } from 'next/server';
import { setExamStatus } from '@/lib/exams';
import { getCurrentUserInfo } from '@/lib/iam';

// PUT /api/exams/[id]/status — { status: 'Draft' | 'Published' | 'Completed' }
// Publishing an exam only reveals its date sheet to Teachers/Parents; it
// does not touch marks or results (see lib/examResults.js for that step).
// Not admin-only anymore — a Class Teacher can also publish (after adding
// their own class's subjects), so the real authorization now happens inside
// setExamStatus itself; this route only needs a signed-in actor.
export async function PUT(request, { params }) {
  const actor = await getCurrentUserInfo();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { status } = await request.json();

  if (!status) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const exam = await setExamStatus(id, status, actor);
    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }
    return NextResponse.json(exam);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
