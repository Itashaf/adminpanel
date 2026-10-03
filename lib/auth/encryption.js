import crypto from 'crypto';

// AES-256-GCM for secrets that must be stored (not just hashed, like a
// password) because the app needs the real plaintext back later — right
// now that's exactly one thing: a school's own Razorpay key secret (see
// School.razorpayKeySecretCipher). `ENCRYPTION_KEY` must be a 32-byte key,
// given as 64 hex characters (generate one with
// `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
// Thrown lazily (not at module load) for the same reason lib/razorpay.js
// builds its client lazily — importing this file must never crash a build
// or a route that happens not to touch encryption yet.
function getKey() {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('ENCRYPTION_KEY env var must be set to 64 hex characters (32 bytes).');
  }
  return Buffer.from(hex, 'hex');
}

// Output format: "iv:authTag:ciphertext", all hex — self-contained, no
// separate column needed for the IV/tag.
export function encryptSecret(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptSecret(cipherText) {
  const [ivHex, authTagHex, dataHex] = cipherText.split(':');
  if (!ivHex || !authTagHex || !dataHex) throw new Error('Malformed encrypted value.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8');
}
