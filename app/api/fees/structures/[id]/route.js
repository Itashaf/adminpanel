import { NextResponse } from 'next/server';
import { deleteFeeStructure, getFeeStructureById, updateFeeStructure } from '@/lib/fees';
import { requirePermission } from '@/lib/rbac';

export async function GET(request, { params }) {
  const { user, error } = await requirePermission('fees.view');
  if (error) return error;
  if (user.roleKey === 'Parent') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const structure = await getFeeStructureById(id);
  if (!structure) {
    return NextResponse.json({ error: 'Fee structure not found' }, { status: 404 });
  }
  return NextResponse.json(structure);
}

export async function PUT(request, { params }) {
  const { error } = await requirePermission('fees.update');
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
  const { error } = await requirePermission('fees.update');
  if (error) return error;

  const { id } = await params;
  const removed = await deleteFeeStructure(id);
  if (!removed) {
    return NextResponse.json({ error: 'Fee structure not found' }, { status: 404 });
  }
  return NextResponse.json({ removed: true });
}
