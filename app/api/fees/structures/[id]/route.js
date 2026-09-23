import { NextResponse } from 'next/server';
import { deleteFeeStructure, getFeeStructureById, updateFeeStructure } from '@/lib/fees';
import { requireSchoolAdmin } from '@/lib/iam';

export async function GET(request, { params }) {
  const { error } = await requireSchoolAdmin();
  if (error) return error;

  const { id } = await params;
  const structure = await getFeeStructureById(id);
  if (!structure) {
    return NextResponse.json({ error: 'Fee structure not found' }, { status: 404 });
  }
  return NextResponse.json(structure);
}

export async function PUT(request, { params }) {
  const { error } = await requireSchoolAdmin();
  if (error) return error;

  const { id } = await params;
  const data = await request.json();

  try {
    const structure = await updateFeeStructure(id, data);
    if (!structure) {
      return NextResponse.json({ error: 'Fee structure not found' }, { status: 404 });
    }
    return NextResponse.json(structure);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { error } = await requireSchoolAdmin();
  if (error) return error;

  const { id } = await params;
  const removed = await deleteFeeStructure(id);
  if (!removed) {
    return NextResponse.json({ error: 'Fee structure not found' }, { status: 404 });
  }
  return NextResponse.json({ removed: true });
}
