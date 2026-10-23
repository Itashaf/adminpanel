import { NextResponse } from 'next/server';
import { verifyRazorpayPayment, getStudentFeeById } from '@/lib/fees';
import { getCurrentUserInfo } from '@/lib/iam';
import { requirePermission } from '@/lib/rbac';
import { readJson } from '@/lib/http';

export async function POST(request) {
  const { studentFeeId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = await readJson(request);

  if (!studentFeeId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Signed-in callers only: a Parent for their own child's fee, anyone else
  // with fees.collect.
  const actor = await getCurrentUserInfo();
  if (!actor) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  if (actor.role === 'Parent') {
    const fee = await getStudentFeeById(studentFeeId);
    if (!fee || fee.studentId !== actor.studentId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } else {
    const { error: authError } = await requirePermission('fees.collect');
    if (authError) return authError;
  }

  try {
    const result = await verifyRazorpayPayment({
      studentFeeId,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
    });
    return NextResponse.json(result);
  } catch (err) {
    // Signature mismatch, wrong order, missing fee, etc. — never a 500,
    // and the fee is never marked PAID on this path (verifyRazorpayPayment
    // only updates StudentFee after the signature check passes).
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
