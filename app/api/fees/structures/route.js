import { NextResponse } from 'next/server';
import { createFeeStructure, getFeeStructures } from '@/lib/fees';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const structures = await getFeeStructures({
    academicSession: searchParams.get('session') || '',
    className: searchParams.get('class') || '',
  });
  return NextResponse.json(structures);
}

export async function POST(request) {
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
