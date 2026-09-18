import { NextResponse } from 'next/server';
import { createRazorpayOrder, getStudentFeeById } from '@/lib/fees';
import { getCurrentUserInfo } from '@/lib/iam';

export async function POST(request) {
  const { studentFeeId } = await request.json();

  if (!studentFeeId) {
    return NextResponse.json({ error: 'Missing studentFeeId' }, { status: 400 });
  }

  // A Parent must only ever be able to open a checkout for their own
  // child's fee — never anyone else's, no matter what studentFeeId is sent.
  const actor = await getCurrentUserInfo();
  if (actor?.role === 'Parent') {
    const fee = await getStudentFeeById(studentFeeId);
    if (!fee || fee.studentId !== actor.studentId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    const order = await createRazorpayOrder(studentFeeId);
    return NextResponse.json(order);
  } catch (err) {
    // Razorpay SDK errors carry a `statusCode` from the API response —
    // 401 means our own RAZORPAY_KEY_ID/KEY_SECRET pair is invalid, which is
    // a server misconfiguration, not something retrying will fix.
    if (err.statusCode === 401) {
      return NextResponse.json({ error: 'Payment gateway authentication failed.' }, { status: 401 });
    }
    if (err.statusCode) {
      return NextResponse.json({ error: err.error?.description || 'Payment gateway error.' }, { status: 500 });
    }
    // No `statusCode` at all means the SDK never got an HTTP response back
    // from Razorpay in the first place (DNS failure, connection refused/
    // timed out, offline server). Confirmed by reproducing it here with this
    // server's own outbound connection to Razorpay actually blocked: Node's
    // usual network error `code`s (ECONNREFUSED etc.) are NOT set on what the
    // SDK throws in that case — instead its own internal error-normalizing
    // code reads a `.status`-shaped field off a response object that was
    // never populated, and THAT secondary TypeError ("Cannot read properties
    // of undefined (reading 'status')") is what ends up as `err.message`,
    // leaking straight to the client as if it were a real payment error.
    // Detected here by matching that exact malformed-message shape (and
    // `instanceof TypeError`, which a genuine Razorpay API error never is)
    // rather than an error code, since no reliable code is available.
    const isMalformedNetworkError =
      err instanceof TypeError || /cannot read propert/i.test(err.message || '');
    if (isMalformedNetworkError) {
      return NextResponse.json(
        { error: 'Unable to reach the payment gateway. Please check the server’s internet connection and try again.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
