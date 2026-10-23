import { encryptSecret, decryptSecret } from './auth/encryption';

// Aadhaar numbers, PAN numbers and bank account numbers are stored encrypted
// (AES-256-GCM, the same ENCRYPTION_KEY as the school payment secrets), so a
// database dump, a backup or a read-only database login no longer shows them in
// the clear. An encrypted value starts with "enc1:"; anything without that prefix
// is an older plain value and is passed through untouched, so rows saved before
// this existed keep working until scripts/encrypt-sensitive-fields.cjs converts
// them. Server-side only (ENCRYPTION_KEY never reaches the browser).
const PREFIX = 'enc1:';

export function encryptField(value) {
  if (typeof value !== 'string' || value === '' || value.startsWith(PREFIX)) return value;
  return PREFIX + encryptSecret(value);
}

export function decryptField(value) {
  if (typeof value !== 'string' || !value.startsWith(PREFIX)) return value;
  try {
    return decryptSecret(value.slice(PREFIX.length));
  } catch (err) {
    console.error('could not decrypt a stored field', err?.message || err);
    return '';
  }
}

// A father / mother / guardian record (a JSON object with an aadhaarNumber).
export function encryptPerson(person) {
  if (!person || typeof person !== 'object') return person;
  return 'aadhaarNumber' in person ? { ...person, aadhaarNumber: encryptField(person.aadhaarNumber) } : person;
}

export function decryptPerson(person) {
  if (!person || typeof person !== 'object') return person;
  return 'aadhaarNumber' in person ? { ...person, aadhaarNumber: decryptField(person.aadhaarNumber) } : person;
}
