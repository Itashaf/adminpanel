import { NextResponse } from 'next/server';
import { createFeeStructure, getFeeStructures } from '@/lib/fees';
import { requirePermission } from '@/lib/rbac';

// fees.view is also held by Parent (for their own child's fee view, GET
// /api/fees/student/[studentId]) — this route lists every fee structure
// school-wide, so Parent needs an explicit block on top, same
// shared-permission-key pattern as every prior module.
export async function GET(request) {
  const { user, error } = await requirePermission('fees.view');
  if (error) return error;
  if (user.roleKey === 'Parent') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const structures = await getFeeStructures({
    academicSession: searchParams.get('session') || '',
    className: searchParams.get('class') || '',
  });
  return NextResponse.json(structures);
}

export async function POST(request) {
  const { error } = await requirePermission('fees.create');
  if (error) return error;

  const data = await request.json();

  if (!data.academicSession || !data.className) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const structure = await createFeeStructure(data);
    return NextResponse.json(structure);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
