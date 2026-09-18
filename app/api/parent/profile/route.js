import { NextResponse } from 'next/server';
import { requireParent } from '@/lib/iam';
import { updateParentSelfProfile } from '@/lib/parentAccounts';

export async function PATCH(request) {
  const { actor, error } = await requireParent();
  if (error) return error;

  const { name, photoUrl } = await request.json();
  try {
    const account = await updateParentSelfProfile(actor.id, actor.schoolId, { name, photoUrl });
    return NextResponse.json({ name: account.name, photoUrl: account.photoUrl });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Could not update profile.' }, { status: 400 });
  }
}
