import { NextResponse } from 'next/server';
import { updateSchoolFeatures } from '@/lib/schools';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { requireSuperAdmin } from '@/lib/iam';

const VALID_KEYS = new Set(FEATURE_FLAGS.map((f) => f.key));

export async function PATCH(request, { params }) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const { id } = await params;
  const { disabledFeatures } = await request.json();

  if (!Array.isArray(disabledFeatures) || disabledFeatures.some((key) => !VALID_KEYS.has(key))) {
    return NextResponse.json({ error: 'Invalid feature keys' }, { status: 400 });
  }

  const school = await updateSchoolFeatures(id, disabledFeatures);
  if (!school) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 });
  }

  return NextResponse.json(school);
}
