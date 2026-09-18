import { NextResponse } from 'next/server';
import { createFeeStructuresForClasses } from '@/lib/fees';

export async function POST(request) {
  const data = await request.json();

  if (!data.academicSession || !Array.isArray(data.classNames) || data.classNames.length === 0) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const result = await createFeeStructuresForClasses(data, data.classNames);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
