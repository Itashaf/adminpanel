import { NextResponse } from 'next/server';
import { createFeeStructure, getFeeStructures } from '@/lib/fees';
import { requireSchoolAdmin } from '@/lib/iam';

export async function GET(request) {
  const { error } = await requireSchoolAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const structures = await getFeeStructures({
    academicSession: searchParams.get('session') || '',
    className: searchParams.get('class') || '',
  });
  return NextResponse.json(structures);
}

export async function POST(request) {
  const { error } = await requireSchoolAdmin();
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
