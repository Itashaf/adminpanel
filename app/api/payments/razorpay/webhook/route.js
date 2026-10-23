import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { handleRazorpayWebhookEvent } from '@/lib/fees';

// Razorpay -> server notification. Without this, a payment is only recorded when
// the parent's own browser/app comes back and calls /verify; if it never does
// (tab closed, network drop) the money is captured but the fee stays unpaid.
//
// Set the same secret in the Razorpay dashboard (Webhooks, events
// payment.captured and order.paid) and in the RAZORPAY_WEBHOOK_SECRET
// environment variable, and point the webhook at
// https://<your-domain>/api/payments/razorpay/webhook
//
// There is no login here by design: the caller is Razorpay, and the only proof
// it is Razorpay is the HMAC signature over the raw request body. With no secret
// configured the endpoint refuses everything.
export async function POST(request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Webhook is not configured.' }, { status: 503 });
  }

  // The signature covers the exact bytes Razorpay sent, so read the raw text
  // before parsing anything.
  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature') || '';
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const valid = expected.length === signature.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  if (!valid) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
  }

  try {
    const result = await handleRazorpayWebhookEvent(event);
    return NextResponse.json({ received: true, ...result });
  } catch (err) {
    // A real failure (database down, say): a 5xx makes Razorpay retry later.
    console.error('razorpay webhook failed', err);
    return NextResponse.json({ error: 'Could not process the event.' }, { status: 500 });
  }
}
