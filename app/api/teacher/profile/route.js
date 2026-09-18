import { NextResponse } from 'next/server';
import { requireTeacher } from '@/lib/iam';
import { updateTeacherSelfProfile } from '@/lib/teachers';

export async function PATCH(request) {
  const { actor, error } = await requireTeacher();
  if (error) return error;

  const { name, photoUrl } = await request.json();
  try {
    const teacher = await updateTeacherSelfProfile(actor.teacherId, actor.schoolId, { name, photoUrl });
    return NextResponse.json({ name: `${teacher.firstName} ${teacher.lastName}`, photoUrl: teacher.photoUrl });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Could not update profile.' }, { status: 400 });
  }
}
