import crypto from 'crypto';
import Razorpay from 'razorpay';

// Built lazily (not at module load) — the Razorpay SDK throws immediately
// if key_id/key_secret are missing, and this module is imported by several
// API routes. A build-time page-data-collection pass (or any boot without
// the payment gateway configured yet) would otherwise crash the whole build
// just from importing this file, even on routes that never touch payments.
// Same globalThis-singleton pattern as lib/db.js — avoids re-instantiating
// the SDK client on every Fast Refresh in dev.
function getRazorpay() {
  if (!globalThis.__RAZORPAY__) {
    globalThis.__RAZORPAY__ = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return globalThis.__RAZORPAY__;
}

const razorpay = new Proxy(
  {},
  {
    get(_target, prop) {
      return getRazorpay()[prop];
    },
  }
);

export default razorpay;

// HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET), compared against
// what Razorpay sent back — the only trustworthy way to know a checkout
// actually completed. Never called with, or trusting, anything from the
// client except these three ids; the amount is looked up server-side from
// our own StudentFee record (see lib/fees.js's verifyRazorpayPayment).
export function verifyRazorpaySignature({ orderId, paymentId, signature }) {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  // Fixed-length HMAC-SHA256 hex digests — timingSafeEqual throws on
  // mismatched lengths, which a forged/truncated signature could trigger,
  // so guard that case as "not equal" rather than letting it throw.
  if (expected.length !== signature?.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
