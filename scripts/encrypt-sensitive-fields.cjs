// One-time job: encrypts the Aadhaar / PAN / bank account numbers that were saved
// as plain text before field encryption was added (see lib/fieldCrypto.js).
//
//   node --env-file=.env scripts/encrypt-sensitive-fields.cjs           (dry run: counts only)
//   node --env-file=.env scripts/encrypt-sensitive-fields.cjs --apply   (writes)
//
// It uses the DATABASE_URL and ENCRYPTION_KEY of whatever environment it is run in,
// so point those at the database you mean to convert. Safe to run twice: values
// that are already encrypted (prefix "enc1:") are left alone. Never prints a value.
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const PREFIX = 'enc1:';
const apply = process.argv.includes('--apply');
const hex = process.env.ENCRYPTION_KEY;
if (!hex || hex.length !== 64) throw new Error('ENCRYPTION_KEY must be 64 hex characters.');
const key = Buffer.from(hex, 'hex');

function enc(value) {
  if (typeof value !== 'string' || value === '' || value.startsWith(PREFIX)) return value;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return PREFIX + [iv.toString('hex'), cipher.getAuthTag().toString('hex'), data.toString('hex')].join(':');
}
const person = (p) => (p && typeof p === 'object' && 'aadhaarNumber' in p ? { ...p, aadhaarNumber: enc(p.aadhaarNumber) } : p);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

(async () => {
  const prisma = new PrismaClient();
  let students = 0;
  let teachers = 0;

  for (const s of await prisma.student.findMany({ select: { id: true, aadhaarNumber: true, guardian: true, secondaryGuardian: true, otherGuardian: true } })) {
    const next = { aadhaarNumber: enc(s.aadhaarNumber), guardian: person(s.guardian), secondaryGuardian: person(s.secondaryGuardian), otherGuardian: person(s.otherGuardian) };
    if (same(next, { aadhaarNumber: s.aadhaarNumber, guardian: s.guardian, secondaryGuardian: s.secondaryGuardian, otherGuardian: s.otherGuardian })) continue;
    students += 1;
    if (apply) {
      const data = { aadhaarNumber: next.aadhaarNumber };
      for (const k of ['guardian', 'secondaryGuardian', 'otherGuardian']) if (s[k]) data[k] = next[k];
      await prisma.student.update({ where: { id: s.id }, data });
    }
  }

  for (const t of await prisma.teacher.findMany({ select: { id: true, aadhaarNumber: true, panNumber: true, father: true, mother: true, guardian: true, bankDetails: true } })) {
    const bank = t.bankDetails && typeof t.bankDetails === 'object' ? { ...t.bankDetails, accountNumber: enc(t.bankDetails.accountNumber) } : t.bankDetails;
    const next = { aadhaarNumber: enc(t.aadhaarNumber), panNumber: enc(t.panNumber), father: person(t.father), mother: person(t.mother), guardian: person(t.guardian), bankDetails: bank };
    if (same(next, { aadhaarNumber: t.aadhaarNumber, panNumber: t.panNumber, father: t.father, mother: t.mother, guardian: t.guardian, bankDetails: t.bankDetails })) continue;
    teachers += 1;
    if (apply) {
      const data = { aadhaarNumber: next.aadhaarNumber, panNumber: next.panNumber };
      for (const k of ['father', 'mother', 'guardian', 'bankDetails']) if (t[k]) data[k] = next[k];
      await prisma.teacher.update({ where: { id: t.id }, data });
    }
  }

  console.log(apply ? 'Encrypted' : 'Would encrypt', 'rows -> students:', students, 'teachers:', teachers);
  await prisma.$disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
