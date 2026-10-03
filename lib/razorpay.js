import crypto from 'crypto';
import Razorpay from 'razorpay';
import prisma from './db';
import { decryptSecret } from './auth/encryption';

// A school's own Razorpay keys (Super Admin-managed, see
// components/superadmin/SchoolPaymentSettingsCard.jsx) — mandatory, no
// platform-wide fallback. Each school's fee payments must settle into that
// school's own Razorpay account, never a shared one. `keyId` is safe to
// hand to the client (Checkout.js needs it); `keySecret` never leaves this
// module except into the Razorpay SDK call / HMAC verify below.
export async function getRazorpayCredentials(schoolId) {
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { razorpayKeyId: true, razorpayKeySecretCipher: true } });
  if (!school?.razorpayKeyId || !school.razorpayKeySecretCipher) {
    throw new Error('Online payments are not set up for this school yet. Contact your platform administrator.');
  }
  return { keyId: school.razorpayKeyId, keySecret: decryptSecret(school.razorpayKeySecretCipher) };
}

// One Razorpay SDK client per school (keyed by schoolId) — not a single
// global singleton, since every school now genuinely uses its own account.
// Still cached across calls within the same process, same reasoning
// lib/db.js's globalThis-singleton pattern already uses (avoids
// re-instantiating on every Fast Refresh in dev).
async function getRazorpayClient(schoolId) {
  globalThis.__RAZORPAY_CLIENTS__ ||= new Map();
  if (!globalThis.__RAZORPAY_CLIENTS__.has(schoolId)) {
    const { keyId, keySecret } = await getRazorpayCredentials(schoolId);
    globalThis.__RAZORPAY_CLIENTS__.set(schoolId, new Razorpay({ key_id: keyId, key_secret: keySecret }));
  }
  return globalThis.__RAZORPAY_CLIENTS__.get(schoolId);
}

export default getRazorpayClient;

// HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET), compared against
// what Razorpay sent back — the only trustworthy way to know a checkout
// actually completed. Never called with, or trusting, anything from the
// client except these three ids; the amount is looked up server-side from
// our own StudentFee record (see lib/fees.js's verifyRazorpayPayment).
// `schoolId` picks whose key secret the signature is checked against —
// must be the same school the order was created for.
export async function verifyRazorpaySignature({ schoolId, orderId, paymentId, signature }) {
  const { keySecret } = await getRazorpayCredentials(schoolId);
  const expected = crypto.createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex');
  // Fixed-length HMAC-SHA256 hex digests — timingSafeEqual throws on
  // mismatched lengths, which a forged/truncated signature could trigger,
  // so guard that case as "not equal" rather than letting it throw.
  if (expected.length !== signature?.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
