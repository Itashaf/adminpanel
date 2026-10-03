import { NextResponse } from 'next/server';
import { updateSchoolRazorpayKeys } from '@/lib/schools';
import { requireSuperAdmin } from '@/lib/iam';

// PATCH /api/schools/[id]/razorpay — Super Admin only. Body: either
// { keyId, keySecret } to set/update this school's own Razorpay account
// (keySecret omitted/empty keeps whatever's already saved), or
// { clear: true } to revert to the platform-wide fallback keys.
export async function PATCH(request, { params }) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const { id } = await params;
  const { keyId, keySecret, clear } = await request.json();

  if (!clear && !keyId) {
    return NextResponse.json({ error: 'Key ID is required.' }, { status: 400 });
  }

  const school = await updateSchoolRazorpayKeys(id, { keyId, keySecret, clear });
  if (!school) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 });
  }

  return NextResponse.json(school);
}
