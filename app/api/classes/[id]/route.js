import { NextResponse } from 'next/server';
import { updateClass, deleteClass, getClassById, getActiveTeacherOptions } from '@/lib/classes';
import { requirePermission } from '@/lib/rbac';
import { readJson } from '@/lib/http';

export async function PUT(request, { params }) {
  const { error: authError } = await requirePermission('classes.manage');
  if (authError) return authError;

  const { id } = await params;
  const data = await readJson(request);

  if (!data.level) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const cls = await updateClass(id, data);
    if (!cls) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }
    return NextResponse.json(cls);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { error: authError } = await requirePermission('classes.manage');
  if (authError) return authError;

  const { id } = await params;
  try {
    const removed = await deleteClass(id);
    if (!removed) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }
    return NextResponse.json({ removed: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// GET /api/classes/:id — one class with its sections plus the active-teacher
// picker options, the same two reads the web /dashboard/classes/[id] page
// does server-side (for the mobile class detail + section form). classes.view.
export async function GET(request, { params }) {
  const { error: authError } = await requirePermission('classes.view');
  if (authError) return authError;
  const { id } = await params;
  const [cls, teacherOptions] = await Promise.all([getClassById(id), getActiveTeacherOptions()]);
  if (!cls) {
    return NextResponse.json({ error: 'Class not found' }, { status: 404 });
  }
  return NextResponse.json({ class: cls, teacherOptions });
}
