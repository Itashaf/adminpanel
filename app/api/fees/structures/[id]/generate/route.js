import { NextResponse } from 'next/server';
import { generateStudentFees } from '@/lib/fees';

export async function POST(request, { params }) {
  const { id } = await params;
  const { term } = await request.json();

  if (!term) {
    return NextResponse.json({ error: 'Missing term' }, { status: 400 });
  }

  try {
    const result = await generateStudentFees(id, term);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
