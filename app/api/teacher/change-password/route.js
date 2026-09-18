import { NextResponse } from 'next/server';
import { requireTeacher } from '@/lib/iam';
import { changeTeacherSelfPassword } from '@/lib/teachers';

export async function POST(request) {
  const { actor, error } = await requireTeacher();
  if (error) return error;

  const { currentPassword, newPassword } = await request.json();
  try {
    await changeTeacherSelfPassword(actor.teacherId, actor.schoolId, currentPassword, newPassword);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Could not change password.' }, { status: 400 });
  }
}
