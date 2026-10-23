import prisma from './db';
import { resolveSchoolId } from './auth/schoolContext';
import { memoPerRequest } from './auth/requestMemo';
import { toLocalDateStr } from './dateUtils';
import { getStudentById } from './students';
import getRazorpayClient, { verifyRazorpaySignature, getRazorpayCredentials } from './razorpay';
import { FEE_TERMS, PAYMENT_METHODS, TERM_DISPLAY_NAMES, TERM_LABELS } from './feeConstants';
import { createNotificationsForStudents } from './parentNotifications';
import { getPushTokensForOwners } from './pushTokens';
import { sendExpoPushNotifications } from './expoPush';
import { createNotice } from './notices';
import { todayInSchoolTz } from './schoolToday';
import { runAfterResponse } from './background';

export { FEE_TERMS, TERM_LABELS, PAYMENT_METHODS } from './feeConstants';

function isDuplicateError(err) {
  return err?.code === 'P2002';
}

function isNotFoundError(err) {
  return err?.code === 'P2025';
}

function decorateFeeStructureItem(item) {
  return {
    id: item.id,
    name: item.name,
    amount: item.amount,
    required: item.required,
    lateFee: item.lateFeeEnabled
      ? {
          enabled: true,
          graceDays: item.lateFeeGraceDays,
          type: item.lateFeeType,
          amount: item.lateFeeAmount,
          maxAmount: item.lateFeeMaxAmount,
        }
      : { enabled: false },
  };
}

// Reshapes a Prisma FeeStructure row (with `terms.items` included) into the
// shape the UI expects — `terms` is always all four keys (`T1`-`T4`), each an
// item array, empty for a term nothing was ever added to, so the frontend
// never has to branch on a missing key. `termTotals`/`totalAmount` (the
// annual total) are computed here rather than stored, same "derive, don't
// denormalize" reasoning as lib/students.js's decorateStudent leaving totals
// out of the DB row itself.
function decorateFeeStructure(row, generatedPairs = new Set()) {
  const terms = { T1: [], T2: [], T3: [], T4: [] };
  const termDates = { T1: '', T2: '', T3: '', T4: '' };
  for (const t of row.terms || []) {
    terms[t.term] = t.items.map(decorateFeeStructureItem);
    termDates[t.term] = t.startDate || '';
  }
  const termTotals = {};
  for (const term of FEE_TERMS) {
    termTotals[term] = terms[term].reduce((sum, item) => sum + item.amount, 0);
  }
  return {
    id: row.id,
    academicSession: row.academicSession,
    className: row.className,
    name: row.name,
    terms,
    termDates,
    termTotals,
    totalAmount: Object.values(termTotals).reduce((sum, amount) => sum + amount, 0),
    // Has Generate Fees ever been run for this class+session — a Student
    // fee already exists for at least one term, so the card's button
    // switches to a disabled "Generated" state instead of inviting a
    // re-click (editing the structure re-syncs PENDING fees on its own —
    // see generateStudentFees — so there's no ongoing reason to re-run it).
    isGenerated: generatedPairs.has(`${row.className}|${row.academicSession}`),
    createdAt: row.createdAt.toISOString().slice(0, 10),
    updatedAt: row.updatedAt.toISOString().slice(0, 10),
  };
}

// One batched query for every structure being decorated, rather than one
// per card — a class+session pair counts as "generated" the moment any
// StudentFee exists for it, in any term.
async function getGeneratedClassSessionPairs(schoolId, structureRows) {
  if (!structureRows.length) return new Set();
  const rows = await prisma.studentFee.findMany({
    where: {
      schoolId,
      OR: structureRows.map((r) => ({ academicSession: r.academicSession, student: { class: r.className } })),
    },
    select: { academicSession: true, student: { select: { class: true } } },
  });
  return new Set(rows.map((r) => `${r.student.class}|${r.academicSession}`));
}

// A discount is stored as a type+value pair (never a pre-computed rupee
// amount) so it stays correct even if totalAmount itself changes later (a
// PENDING fee gets re-synced when its FeeStructure is edited and
// re-generated — see generateStudentFees) — a PERCENT discount should still
// mean the same percentage of the new total, not a stale rupee figure from
// whatever the total used to be.
function discountAmountFor(fee) {
  if (!fee.discountType || !fee.discountValue) return 0;
  if (fee.discountType === 'PERCENT') return Math.round((fee.totalAmount * fee.discountValue) / 100);
  return Math.min(fee.discountValue, fee.totalAmount);
}

// How many days past this term's hard due date (see termEndDate below —
// hoisted, so declaration order here doesn't matter) today is; 0 if not yet
// due, or if the term has no computable due date.
function daysOverdueFor(fee) {
  const dueDate = termEndDate(fee.academicSession, fee.term);
  if (!dueDate) return 0;
  return Math.max(0, Math.floor((new Date() - dueDate) / (24 * 60 * 60 * 1000)));
}

// Sums each item's own late fee (FIXED or PER_DAY, capped at maxAmount) once
// its own grace period has passed since the term's due date — a fully
// optional, per-item, admin-configured setting (see
// FeeStructureFormModal.jsx's "Late Fee" section / generateStudentFees,
// which snapshots it onto each StudentFeeItem). An item with lateFeeEnabled
// false (the column default) never contributes anything, so a fee generated
// before this existed, or one an admin never turned it on for, accrues
// nothing — the late fee flow works exactly the same with or without it set.
function lateFeeAmountFor(fee) {
  const daysOverdue = daysOverdueFor(fee);
  if (daysOverdue <= 0 || !fee.items?.length) return 0;
  return fee.items.reduce((sum, item) => {
    if (!item.lateFeeEnabled) return sum;
    const effectiveDays = daysOverdue - (item.lateFeeGraceDays || 0);
    if (effectiveDays <= 0) return sum;
    const amount = item.lateFeeType === 'PER_DAY' ? (item.lateFeeAmount || 0) * effectiveDays : item.lateFeeAmount || 0;
    return sum + (item.lateFeeMaxAmount ? Math.min(amount, item.lateFeeMaxAmount) : amount);
  }, 0);
}

// The real amount owed — totalAmount minus any discount, plus any late fee
// accrued so far. Every "due"/"payable" figure in this file should go
// through this (requires `fee.items` with the lateFee snapshot columns,
// and `fee.academicSession`/`fee.term`) rather than the bare
// `totalAmount - discountAmountFor(fee)` pattern, now that a fee can owe
// more than its sticker amount.
function payableAmountFor(fee) {
  return fee.totalAmount - discountAmountFor(fee) + lateFeeAmountFor(fee);
}

function decorateStudentFee(row) {
  const discountAmount = discountAmountFor(row);
  const lateFeeAmount = lateFeeAmountFor(row);
  const daysOverdue = daysOverdueFor(row);
  // Most recent successful Payment against this fee — the receipt (see
  // StudentFeeDetailPanel.jsx's printReceipt) needs the actual transaction
  // id/date, not just the StudentFee's own totals.
  const successfulPayments = (row.payments || []).filter((p) => p.status === 'SUCCESS');
  const latestPayment = successfulPayments.sort((a, b) => new Date(b.paidAt || b.createdAt) - new Date(a.paidAt || a.createdAt))[0];
  return {
    id: row.id,
    studentId: row.studentId,
    academicSession: row.academicSession,
    term: row.term,
    totalAmount: row.totalAmount,
    paidAmount: row.paidAmount,
    status: row.status,
    discountType: row.discountType,
    discountValue: row.discountValue,
    discountReason: row.discountReason,
    discountAmount,
    lateFeeAmount,
    daysOverdue,
    payableAmount: payableAmountFor(row),
    items: (row.items || []).map((item) => ({
      id: item.id,
      name: item.name,
      amount: item.amount,
      lateFee: item.lateFeeEnabled
        ? { enabled: true, graceDays: item.lateFeeGraceDays, type: item.lateFeeType, amount: item.lateFeeAmount, maxAmount: item.lateFeeMaxAmount }
        : { enabled: false },
    })),
    createdAt: row.createdAt.toISOString().slice(0, 10),
    payment: latestPayment
      ? {
          method: latestPayment.method,
          transactionId: latestPayment.razorpayPaymentId || null,
          paidAt: latestPayment.paidAt ? latestPayment.paidAt.toISOString() : null,
        }
      : null,
  };
}

// RCPT-000123 - null for a payment that has no receipt number (pending, failed, or older ones).
function formatReceiptNo(n) {
  return n ? `RCPT-${String(n).padStart(6, '0')}` : null;
}

function decoratePayment(row) {
  const discountAmount = row.studentFee ? discountAmountFor(row.studentFee) : 0;
  return {
    id: row.id,
    studentId: row.studentId,
    studentName: row.student ? `${row.student.firstName} ${row.student.lastName}` : '',
    class: row.student?.class || '',
    section: row.student?.section || '',
    studentFeeId: row.studentFeeId,
    term: row.studentFee?.term,
    amount: row.amount,
    method: row.method,
    status: row.status,
    razorpayOrderId: row.razorpayOrderId,
    razorpayPaymentId: row.razorpayPaymentId,
    // Full ISO (not date-only) — the Payments table shows the time
    // alongside the date, not just the day.
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
    receiptNo: formatReceiptNo(row.receiptNumber),
    collectedByName: row.collectedByName || null,
    reversedAt: row.reversedAt ? row.reversedAt.toISOString() : null,
    reversalReason: row.reversalReason || null,
    createdAt: row.createdAt.toISOString(),
    feeTotalAmount: row.studentFee?.totalAmount ?? null,
    discountAmount,
    discountReason: discountAmount > 0 ? row.studentFee?.discountReason || null : null,
  };
}

// ---- Fee Structures ----

const FEE_STRUCTURE_INCLUDE = { terms: { include: { items: true } } };

export async function getFeeStructures({ academicSession = '', className = '' } = {}) {
  const schoolId = await resolveSchoolId();
  const rows = await prisma.feeStructure.findMany({
    where: {
      schoolId,
      ...(academicSession ? { academicSession } : {}),
      ...(className ? { className } : {}),
    },
    include: FEE_STRUCTURE_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });
  const generatedPairs = await getGeneratedClassSessionPairs(schoolId, rows);
  return rows.map((row) => decorateFeeStructure(row, generatedPairs));
}

export async function getFeeStructureById(id) {
  const schoolId = await resolveSchoolId();
  const row = await prisma.feeStructure.findFirst({
    where: { id, schoolId },
    include: FEE_STRUCTURE_INCLUDE,
  });
  if (!row) return null;
  const generatedPairs = await getGeneratedClassSessionPairs(schoolId, [row]);
  return decorateFeeStructure(row, generatedPairs);
}

// `terms` is `{ T1: [items], T2: [items], T3: [items], T4: [items] }` —
// a term with no items is simply omitted from what actually gets persisted
// (see toTermsCreateData below), not an error; the structure just needs at
// least one item somewhere across all four terms.
function validateTerms(terms) {
  if (!terms || typeof terms !== 'object') throw new Error('Add at least one fee item to at least one term.');
  let hasAnyItem = false;
  for (const term of FEE_TERMS) {
    const items = terms[term];
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      if (!item.name?.trim()) throw new Error('Every fee item needs a name.');
      if (!(Number(item.amount) > 0)) throw new Error(`"${item.name}" must have a positive amount.`);
      hasAnyItem = true;
    }
  }
  if (!hasAnyItem) throw new Error('Add at least one fee item to at least one term.');
}

function toItemCreateData(item) {
  const lateFee = item.lateFee || {};
  return {
    name: item.name.trim(),
    amount: Number(item.amount),
    required: item.required !== false,
    lateFeeEnabled: Boolean(lateFee.enabled),
    lateFeeGraceDays: lateFee.enabled && lateFee.graceDays ? Number(lateFee.graceDays) : null,
    lateFeeType: lateFee.enabled ? lateFee.type || null : null,
    lateFeeAmount: lateFee.enabled && lateFee.amount ? Number(lateFee.amount) : null,
    lateFeeMaxAmount: lateFee.enabled && lateFee.maxAmount ? Number(lateFee.maxAmount) : null,
  };
}

// Only terms that actually have at least one item become a FeeStructureTerm
// row — an empty Q4 (say) stays entirely absent rather than an empty row.
function toTermsCreateData(terms, termDates = {}) {
  return FEE_TERMS.filter((term) => (terms[term] || []).length > 0).map((term) => ({
    term,
    startDate: termDates[term] || '',
    items: { create: terms[term].map(toItemCreateData) },
  }));
}

// The earliest term (T1..T4 order) that actually has fee items — `terms`
// always has at least one somewhere (validateTerms already enforced that),
// but not necessarily T1 itself (an admin could configure only Q2 onward).
function firstConfiguredTerm(terms) {
  return FEE_TERMS.find((term) => (terms[term] || []).length > 0);
}

// A term with no startDate set is generated immediately (the old behavior,
// preserved for anyone who never bothers setting dates) — one WITH a date
// only becomes due once that date actually arrives, letting
// generateDueStudentFees (the cron path) pick it up later instead of
// billing students for a quarter that hasn't started yet.
function isTermDue(startDate) {
  return !startDate || startDate <= todayInSchoolTz();
}

async function createOneFeeStructure(schoolId, { academicSession, className, name, terms, termDates = {} }) {
  const row = await prisma.feeStructure.create({
    data: {
      schoolId,
      academicSession,
      className,
      name: name || `${className} Fee Structure`,
      terms: { create: toTermsCreateData(terms, termDates) },
    },
    include: FEE_STRUCTURE_INCLUDE,
  });

  // Auto-bill the class's students for the earliest configured quarter right
  // away — but only if that quarter is actually due (no date set, or its
  // date has already arrived); a future-dated first term is left for
  // generateDueStudentFees to pick up on its own start date instead of
  // billing students for a quarter that hasn't started. Best-effort: a
  // generation hiccup (no active students in this class yet, say) must never
  // fail the structure's own creation, which already succeeded above.
  const firstTerm = firstConfiguredTerm(terms);
  if (firstTerm && isTermDue(termDates[firstTerm])) {
    try {
      await generateStudentFees(row.id, firstTerm);
    } catch {
      // See comment above — swallow it.
    }
  }

  return decorateFeeStructure(row);
}

export async function createFeeStructure(data) {
  validateTerms(data.terms);
  try {
    return await createOneFeeStructure(await resolveSchoolId(), data);
  } catch (err) {
    if (isDuplicateError(err)) {
      throw new Error(`A fee structure for ${data.className} in ${data.academicSession} already exists.`);
    }
    throw err;
  }
}

// Same fee schedule (terms/items/name) applied to several classes in one go
// — backs the "Create Structure" modal's multi-class picker and the
// "Duplicate" action on an existing structure, so an admin doesn't have to
// re-enter the same fee heads once per class. One class that already has a
// structure for this session doesn't block the rest — it's just reported
// back as skipped, same skip/report convention as bulk student import.
export async function createFeeStructuresForClasses(data, classNames) {
  validateTerms(data.terms);
  const schoolId = await resolveSchoolId();

  // Each class's structure (+ its own auto-billing pass) is fully
  // independent of every other's — no shared row, no ordering requirement —
  // so these run together instead of one class waiting on the round-trip
  // for the class before it. allSettled (not all) so one class already
  // having a structure for this session doesn't stop the rest.
  const results = await Promise.allSettled(
    classNames.map((className) => createOneFeeStructure(schoolId, { ...data, className }))
  );

  const created = [];
  const skipped = [];
  results.forEach((result, index) => {
    const className = classNames[index];
    if (result.status === 'fulfilled') {
      created.push(result.value);
    } else {
      const err = result.reason;
      const reason = isDuplicateError(err)
        ? `A fee structure for ${className} in ${data.academicSession} already exists.`
        : err.message;
      skipped.push({ className, reason });
    }
  });
  return { created, skipped };
}

// Terms+items are fully replaced (delete + recreate) rather than diffed —
// simpler, and safe because StudentFeeItem rows are independent copies made
// at generation time (see generateStudentFees), so this never touches
// already-generated student fees.
export async function updateFeeStructure(id, data) {
  validateTerms(data.terms);
  const existing = await getFeeStructureById(id);
  if (!existing) return null;

  try {
    const row = await prisma.$transaction(async (tx) => {
      await tx.feeStructureTerm.deleteMany({ where: { feeStructureId: id } }); // items cascade
      return tx.feeStructure.update({
        where: { id },
        data: {
          name: data.name || existing.name,
          terms: { create: toTermsCreateData(data.terms, data.termDates) },
        },
        include: FEE_STRUCTURE_INCLUDE,
      });
    });
    return decorateFeeStructure(row);
  } catch (err) {
    if (isNotFoundError(err)) return null;
    throw err;
  }
}

export async function deleteFeeStructure(id) {
  const existing = await getFeeStructureById(id);
  if (!existing) return null;
  await prisma.feeStructure.delete({ where: { id } }); // terms + items cascade
  return existing;
}

// ---- Generating Student Fees for one term of a structure ----

// Copies that term's current items onto a StudentFee for every Active
// student in the structure's class + academic session. A student with no
// StudentFee yet gets one created; a student who already has one for this
// session+term gets it *re-synced* to the structure's current items if it's
// still PENDING (the whole point of clicking Generate again after editing
// the structure — e.g. adding a missed fee item — is for that change to
// actually reach students who haven't paid yet) — but a PAID one is never
// touched, since money already collected against the old items must never
// silently change underneath it.
export async function generateStudentFees(feeStructureId, term) {
  if (!FEE_TERMS.includes(term)) throw new Error('Invalid term.');

  const structure = await getFeeStructureById(feeStructureId);
  if (!structure) throw new Error('Fee structure not found.');
  const items = structure.terms[term];
  if (!items.length) throw new Error(`No fee items configured for ${TERM_DISPLAY_NAMES[term]} in this structure.`);

  const schoolId = await resolveSchoolId();
  // Only the students of this one class, and only the columns billing needs.
  const eligibleStudents = await prisma.student.findMany({
    where: { schoolId, class: structure.className, academicSession: structure.academicSession, status: 'Active' },
    select: { id: true, discountType: true, discountValue: true, discountReason: true },
  });

  if (eligibleStudents.length === 0) {
    return { generatedCount: 0, updatedCount: 0, skippedCount: 0, totalEligible: 0 };
  }

  const existing = await prisma.studentFee.findMany({
    where: {
      studentId: { in: eligibleStudents.map((s) => s.id) },
      academicSession: structure.academicSession,
      term,
    },
    select: { id: true, studentId: true, status: true },
  });
  const existingByStudent = new Map(existing.map((row) => [row.studentId, row]));
  const toCreate = eligibleStudents.filter((s) => !existingByStudent.has(s.id));
  const toUpdate = existing.filter((row) => row.status === 'PENDING');
  const alreadyPaidCount = existing.length - toUpdate.length;

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const itemsCreateData = items.map((item) => ({
    name: item.name,
    amount: item.amount,
    lateFeeEnabled: item.lateFee?.enabled || false,
    lateFeeGraceDays: item.lateFee?.enabled ? item.lateFee.graceDays : null,
    lateFeeType: item.lateFee?.enabled ? item.lateFee.type : null,
    lateFeeAmount: item.lateFee?.enabled ? item.lateFee.amount : null,
    lateFeeMaxAmount: item.lateFee?.enabled ? item.lateFee.maxAmount : null,
  }));

  // A handful of bulk statements instead of one create/update per student, so a big class
  // no longer needs hundreds of round trips inside one transaction.
  await prisma.$transaction(
    async (tx) => {
      if (toCreate.length) {
        await tx.studentFee.createMany({
          data: toCreate.map((student) => ({
            schoolId,
            studentId: student.id,
            academicSession: structure.academicSession,
            term,
            totalAmount,
            // Carries the student's standing discount (see Student model's
            // discountType comment) onto every newly-generated term — the
            // whole point of setting it once instead of per-term.
            discountType: student.discountType || null,
            discountValue: student.discountValue || null,
            discountReason: student.discountReason || null,
          })),
          skipDuplicates: true,
        });
        // The new fees are the ones of these students that have no items yet.
        const created = await tx.studentFee.findMany({
          where: {
            studentId: { in: toCreate.map((s) => s.id) },
            academicSession: structure.academicSession,
            term,
            items: { none: {} },
          },
          select: { id: true },
        });
        if (created.length) {
          await tx.studentFeeItem.createMany({
            data: created.flatMap((fee) => itemsCreateData.map((item) => ({ ...item, studentFeeId: fee.id }))),
          });
        }
      }

      if (toUpdate.length) {
        // Re-checked inside the transaction: a fee paid since the read above is left alone.
        const stillPending = await tx.studentFee.findMany({
          where: { id: { in: toUpdate.map((row) => row.id) }, schoolId, status: 'PENDING' },
          select: { id: true },
        });
        const ids = stillPending.map((row) => row.id);
        if (ids.length) {
          await tx.studentFeeItem.deleteMany({ where: { studentFeeId: { in: ids } } });
          await tx.studentFee.updateMany({ where: { id: { in: ids } }, data: { totalAmount } });
          await tx.studentFeeItem.createMany({
            data: ids.flatMap((studentFeeId) => itemsCreateData.map((item) => ({ ...item, studentFeeId }))),
          });
        }
      }
    },
    { timeout: 60000 }
  );

  return {
    generatedCount: toCreate.length,
    updatedCount: toUpdate.length,
    skippedCount: alreadyPaidCount,
    totalEligible: eligibleStudents.length,
  };
}

// Called right after a new student is created (lib/students.js's addStudent,
// via dynamic import to avoid a circular import — this file already imports
// FROM students.js) — bills them for every term that's already been
// generated for their own class+session, so a student added mid-year
// doesn't sit at "No Fees" just because they missed the Fee Structure's own
// creation-time auto-bill. "Already generated for this class" is read off
// real StudentFee rows (any one classmate's term is proof it's live),
// not re-derived from a term's startDate — that keeps this correct whether
// the term was generated by the structure's own creation, the daily cron,
// or an admin's manual "Generate Fees" click. Best-effort: never throws,
// same convention as every other post-creation side effect in this app
// (push notifications, admin notifications) — a billing hiccup must never
// turn into a failed student creation.
export async function generateFeesForNewStudent(schoolId, student) {
  try {
    const structure = await prisma.feeStructure.findUnique({
      where: { schoolId_academicSession_className: { schoolId, academicSession: student.academicSession, className: student.class } },
      include: { terms: { include: { items: true } } },
    });
    if (!structure) return;

    const generatedTerms = await prisma.studentFee.findMany({
      where: { schoolId, academicSession: student.academicSession, student: { class: student.class } },
      distinct: ['term'],
      select: { term: true },
    });
    if (generatedTerms.length === 0) return;

    const termsToBill = structure.terms.filter(
      (t) => t.items.length > 0 && generatedTerms.some((g) => g.term === t.term)
    );

    for (const term of termsToBill) {
      const totalAmount = term.items.reduce((sum, item) => sum + item.amount, 0);
      await prisma.studentFee
        .create({
          data: {
            schoolId,
            studentId: student.id,
            academicSession: student.academicSession,
            term: term.term,
            totalAmount,
            discountType: student.discountType || null,
            discountValue: student.discountValue || null,
            discountReason: student.discountReason || null,
            items: {
              create: term.items.map((item) => ({
                name: item.name,
                amount: item.amount,
                lateFeeEnabled: item.lateFeeEnabled,
                lateFeeGraceDays: item.lateFeeGraceDays,
                lateFeeType: item.lateFeeType,
                lateFeeAmount: item.lateFeeAmount,
                lateFeeMaxAmount: item.lateFeeMaxAmount,
              })),
            },
          },
        })
        .catch((err) => {
          if (!isDuplicateError(err)) throw err;
        });
    }
  } catch (err) {
    console.error('generateFeesForNewStudent failed', err);
  }
}

// Called daily by the Vercel Cron job (app/api/cron/generate-fees route) —
// finds every term, across every fee structure, whose startDate has arrived
// and generates it exactly as if an admin had clicked "Generate Fees" for
// that term (same idempotent create-or-resync-PENDING logic). Only terms
// with an actual startDate set are considered — a dateless term is the
// "fully manual, admin clicks Generate" case documented on the schema field
// and is deliberately never touched here, only by generateStudentFees
// directly (createOneFeeStructure's own creation-time auto-bill, or the
// manual GenerateFeesModal). Same single-active-school scoping as
// everything else in this app (resolveSchoolId()'s no-session fallback) —
// a cron invocation has no cookies, so this resolves the same "current
// active school" a script or unauthenticated context always falls back to.
export async function generateDueStudentFees() {
  const structures = await getFeeStructures();
  const today = todayInSchoolTz();
  const results = [];

  for (const structure of structures) {
    for (const term of FEE_TERMS) {
      const startDate = structure.termDates[term];
      const hasItems = structure.terms[term].length > 0;
      if (!hasItems || !startDate || startDate > today) continue;
      try {
        const result = await generateStudentFees(structure.id, term);
        if (result.generatedCount > 0 || result.updatedCount > 0) {
          results.push({ structureId: structure.id, className: structure.className, term, ...result });
        }
      } catch (err) {
        console.error(`generateDueStudentFees failed for structure ${structure.id} term ${term}`, err);
      }
    }
  }

  return results;
}

// ---- Student Fees ----

export async function getStudentFees(studentId, academicSession) {
  const rows = await prisma.studentFee.findMany({
    where: { studentId, schoolId: await resolveSchoolId(), ...(academicSession ? { academicSession } : {}) },
    include: { items: true, payments: true },
    orderBy: { term: 'asc' },
  });
  return rows.map(decorateStudentFee);
}

// Single-student version of getStudentFeeSummaries's derived status — the
// Parent Portal's "Fees" home card (total due + status), across every term
// generated for the student in the given academic session (all sessions if
// omitted), without needing the per-term item breakdown getStudentFees
// returns.
export async function getStudentFeeSummary(studentId, academicSession = '') {
  const fees = await prisma.studentFee.findMany({
    where: { studentId, schoolId: await resolveSchoolId(), ...(academicSession ? { academicSession } : {}) },
    select: { totalAmount: true, paidAmount: true, discountType: true, discountValue: true, academicSession: true, term: true, items: true },
  });

  if (fees.length === 0) {
    return { totalFee: 0, paid: 0, due: 0, feeStatus: 'NO_FEES' };
  }

  // PARTIAL means a *term itself* was paid less than its own amount (e.g.
  // ₹10,000 paid against a ₹15,000 term) — one term fully paid sitting next
  // to another term not yet paid at all is DUE overall, not PARTIAL. Summing
  // paid/due across terms and comparing the totals would wrongly call that
  // second case PARTIAL, so each term's own paid-vs-payable gap is checked
  // individually instead.
  let totalFee = 0;
  let paid = 0;
  let hasPartialTerm = false;
  let hasDueTerm = false;
  for (const fee of fees) {
    const payable = payableAmountFor(fee);
    totalFee += payable;
    paid += fee.paidAmount;
    if (fee.paidAmount > 0 && fee.paidAmount < payable) hasPartialTerm = true;
    else if (fee.paidAmount <= 0 && payable > 0) hasDueTerm = true;
  }
  const due = totalFee - paid;
  const feeStatus = hasPartialTerm ? 'PARTIAL' : hasDueTerm ? 'DUE' : 'PAID';
  return { totalFee, paid, due, feeStatus };
}

export async function getStudentFeeById(id) {
  const row = await prisma.studentFee.findFirst({
    where: { id, schoolId: await resolveSchoolId() },
    include: { items: true },
  });
  return row ? decorateStudentFee(row) : null;
}

// Narrow selects for the Student Fees table below — only the columns the
// per-student total/status math and the table row actually read, not the
// whole Student row (guardian/address/documents Json) or every fee item column.
const SUMMARY_STUDENT_SELECT = {
  id: true,
  admissionId: true,
  firstName: true,
  lastName: true,
  class: true,
  section: true,
  status: true,
  lastFeeReminderAt: true,
};

const SUMMARY_FEE_SELECT = {
  studentId: true,
  totalAmount: true,
  paidAmount: true,
  discountType: true,
  discountValue: true,
  academicSession: true,
  term: true,
  items: {
    select: { lateFeeEnabled: true, lateFeeGraceDays: true, lateFeeType: true, lateFeeAmount: true, lateFeeMaxAmount: true },
  },
};

// Which Active students the Student Fees table is about: class/section/session
// narrow the student list, and `search` matches the name, the admission id, or
// — a transaction id (Razorpay's payment id) doesn't live on Student at all —
// the student behind a matching Payment, so one search box covers "find this
// student" and "who made this payment" alike. A multi-word search needs every
// word to appear in the first or last name.
async function studentFeeCandidateWhere(schoolId, { academicSession, className, section, search }) {
  const conditions = [{ schoolId, status: 'Active' }];
  if (academicSession) conditions.push({ academicSession });
  if (className) conditions.push({ class: className });
  if (section) conditions.push({ section });

  const query = (search || '').trim();
  if (query) {
    const paymentMatches = await prisma.payment.findMany({
      where: { schoolId, razorpayPaymentId: { contains: query, mode: 'insensitive' } },
      select: { studentId: true },
    });
    const paymentStudentIds = [...new Set(paymentMatches.map((p) => p.studentId))];
    const contains = (field, word) => ({ [field]: { contains: word, mode: 'insensitive' } });
    const nameMatch = {
      AND: query.split(/\s+/).map((word) => ({ OR: [contains('firstName', word), contains('lastName', word)] })),
    };
    conditions.push({
      OR: [nameMatch, contains('admissionId', query), ...(paymentStudentIds.length ? [{ id: { in: paymentStudentIds } }] : [])],
    });
  }
  return { AND: conditions };
}

// Same per-term derivation as getStudentFeeSummary — PARTIAL only when a
// term itself was paid less than its own amount, never from one paid term
// plus one untouched term summing into a false partial.
function buildStudentFeeRows(students, fees) {
  const totalsByStudent = new Map();
  for (const fee of fees) {
    const entry = totalsByStudent.get(fee.studentId) || { totalFee: 0, paid: 0, hasPartialTerm: false, hasDueTerm: false };
    const payable = payableAmountFor(fee);
    entry.totalFee += payable;
    entry.paid += fee.paidAmount;
    if (fee.paidAmount > 0 && fee.paidAmount < payable) entry.hasPartialTerm = true;
    else if (fee.paidAmount <= 0 && payable > 0) entry.hasDueTerm = true;
    totalsByStudent.set(fee.studentId, entry);
  }

  return students.map((s) => {
    const totals = totalsByStudent.get(s.id) || { totalFee: 0, paid: 0, hasPartialTerm: false, hasDueTerm: false };
    const feeStatus =
      totals.totalFee === 0 ? 'NO_FEES' : totals.hasPartialTerm ? 'PARTIAL' : totals.hasDueTerm ? 'DUE' : 'PAID';
    return {
      studentId: s.id,
      admissionId: s.admissionId,
      name: `${s.firstName} ${s.lastName}`,
      class: s.class,
      section: s.section,
      status: s.status,
      totalFee: totals.totalFee,
      paid: totals.paid,
      due: totals.totalFee - totals.paid,
      feeStatus,
      lastFeeReminderAt: s.lastFeeReminderAt ? s.lastFeeReminderAt.toISOString() : null,
    };
  });
}

const SUMMARY_ORDER = [{ createdAt: 'asc' }, { id: 'asc' }];

// Per-student fee summary for the Student Fees table — one row per Active
// student (across ALL their generated terms for the given academic session,
// not one term at a time), with a derived overall status:
// - 'NO_FEES': nothing generated for them yet
// - 'DUE': generated but nothing paid
// - 'PARTIAL': some paid, some still owed
// - 'PAID': fully paid
// Class/section/search filter the *student* list at the query. `status` and a
// Paid/Due sort depend on every term's totals (and late fee), so they can't be
// a plain WHERE/ORDER BY — those two cases total up every matching student
// (narrow columns only) and slice afterwards. The default view (no status, no
// Paid/Due sort) is paged in the database: only `pageSize` students and their
// own fee rows are ever loaded.
export async function getStudentFeeSummaries({
  academicSession = '',
  className = '',
  section = '',
  status = '',
  search = '',
  sortBy = '',
  sortDir = 'desc',
  page = 1,
  pageSize = 10,
} = {}) {
  const schoolId = await resolveSchoolId();
  const where = await studentFeeCandidateWhere(schoolId, { academicSession, className, section, search });
  const needsAllRows = Boolean(status) || sortBy === 'paid' || sortBy === 'due';
  const sessionFilter = academicSession ? { academicSession } : {};

  if (!needsAllRows) {
    const [total, students] = await Promise.all([
      prisma.student.count({ where }),
      prisma.student.findMany({ where, orderBy: SUMMARY_ORDER, skip: (page - 1) * pageSize, take: pageSize, select: SUMMARY_STUDENT_SELECT }),
    ]);
    if (students.length === 0) return { rows: [], total, page, pageSize };
    const fees = await prisma.studentFee.findMany({
      where: { schoolId, studentId: { in: students.map((s) => s.id) }, ...sessionFilter },
      select: SUMMARY_FEE_SELECT,
    });
    return { rows: buildStudentFeeRows(students, fees), total, page, pageSize };
  }

  const students = await prisma.student.findMany({ where, orderBy: SUMMARY_ORDER, select: SUMMARY_STUDENT_SELECT });
  if (students.length === 0) return { rows: [], total: 0, page, pageSize };
  const fees = await prisma.studentFee.findMany({ where: { schoolId, student: where, ...sessionFilter }, select: SUMMARY_FEE_SELECT });

  let rows = buildStudentFeeRows(students, fees);
  if (status) rows = rows.filter((r) => r.feeStatus === status);
  if (sortBy === 'paid' || sortBy === 'due') {
    const dir = sortDir === 'asc' ? 1 : -1;
    rows = [...rows].sort((a, b) => (a[sortBy] - b[sortBy]) * dir);
  }

  const total = rows.length;
  const start = (page - 1) * pageSize;
  return { rows: rows.slice(start, start + pageSize), total, page, pageSize };
}

// Ids of every Active student with money still owed on at least one term
// (optionally one class/section) — SendFeesReminderModal's "All pending
// fees" and "A specific class" target groups. Returned straight as ids,
// instead of the modal paging a 5,000-row summary list and filtering it.
export async function getStudentIdsWithDue({ className = '', section = '' } = {}) {
  const schoolId = await resolveSchoolId();
  const where = await studentFeeCandidateWhere(schoolId, { className, section });
  const students = await prisma.student.findMany({ where, orderBy: SUMMARY_ORDER, select: SUMMARY_STUDENT_SELECT });
  if (students.length === 0) return [];
  const fees = await prisma.studentFee.findMany({ where: { schoolId, student: where }, select: SUMMARY_FEE_SELECT });
  return buildStudentFeeRows(students, fees)
    .filter((row) => row.due > 0)
    .map((row) => row.studentId);
}

// Every Payment ever recorded for one student, most recent first — the
// "View Ledger" panel on the Student Fees page.
export async function getPaymentLedger(studentId) {
  const rows = await prisma.payment.findMany({
    where: { schoolId: await resolveSchoolId(), studentId },
    include: { student: true, studentFee: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(decoratePayment);
}

// ---- Discounts ----

const DISCOUNT_TYPES = ['FIXED', 'PERCENT'];

// Stores the discount as type+value (see discountAmountFor's comment on why)
// and recomputes status against the new payable amount — a discount can
// turn a still-PARTIAL fee into PAID (or, if it's later removed, put a fee
// that already looked PAID back into PARTIAL/PENDING). Blocks a discount
// that would drop the payable amount below what's already been collected —
// that's a refund situation, out of scope here, not something to leave the
// fee record in an inconsistent (owes-less-than-it-already-received) state
// over.
export async function applyFeeDiscount(studentFeeId, { discountType, discountValue, discountReason }, actor) {
  if (!DISCOUNT_TYPES.includes(discountType)) throw new Error('Invalid discount type.');
  const value = Number(discountValue);
  if (!(value > 0)) throw new Error('Enter a positive discount value.');
  if (discountType === 'PERCENT' && value > 100) throw new Error('Percentage discount cannot exceed 100%.');

  const schoolId = await resolveSchoolId();
  const fee = await getStudentFeeById(studentFeeId);
  if (!fee) throw new Error('Student fee record not found.');
  if (discountType === 'FIXED' && value > fee.totalAmount) {
    throw new Error(`Discount cannot exceed the total fee amount (₹${fee.totalAmount}).`);
  }

  const discountAmount = discountType === 'PERCENT' ? Math.round((fee.totalAmount * value) / 100) : value;
  const newPayable = fee.totalAmount - discountAmount;
  if (newPayable < fee.paidAmount) {
    throw new Error(
      `This discount would bring the payable amount (₹${newPayable}) below what's already been paid (₹${fee.paidAmount}). Lower the discount or process a refund first.`
    );
  }

  // `schoolId` in the `where` is defense-in-depth, not the only thing
  // stopping a cross-school write — getStudentFeeById above already
  // scoped the read. Repeating it here means this statement is safe on its
  // own, without relying on a reader remembering that an earlier fetch
  // checked it.
  const newStatus = newPayable <= fee.paidAmount ? 'PAID' : fee.paidAmount > 0 ? 'PARTIAL' : 'PENDING';
  const [row] = await prisma.$transaction([
    prisma.studentFee.update({
      where: { id: fee.id, schoolId },
      data: { discountType, discountValue: value, discountReason: discountReason?.trim() || null, status: newStatus },
      include: { items: true },
    }),
    logFeeAudit(prisma, schoolId, 'DISCOUNT_APPLIED', actor, {
      studentId: fee.studentId,
      studentFeeId: fee.id,
      meta: { discountType, discountValue: value, reason: discountReason?.trim() || null, previous: fee.discountType ? { discountType: fee.discountType, discountValue: fee.discountValue } : null },
    }),
  ]);
  return decorateStudentFee(row);
}

export async function removeFeeDiscount(studentFeeId, actor) {
  const schoolId = await resolveSchoolId();
  const fee = await getStudentFeeById(studentFeeId);
  if (!fee) throw new Error('Student fee record not found.');

  const newStatus = fee.paidAmount >= fee.totalAmount ? 'PAID' : fee.paidAmount > 0 ? 'PARTIAL' : 'PENDING';
  const [row] = await prisma.$transaction([
    prisma.studentFee.update({
      where: { id: fee.id, schoolId },
      data: { discountType: null, discountValue: null, discountReason: null, status: newStatus },
      include: { items: true },
    }),
    logFeeAudit(prisma, schoolId, 'DISCOUNT_REMOVED', actor, {
      studentId: fee.studentId,
      studentFeeId: fee.id,
      meta: { previous: fee.discountType ? { discountType: fee.discountType, discountValue: fee.discountValue } : null },
    }),
  ]);
  return decorateStudentFee(row);
}

// ---- Standing (student-level, recurring) discount ----
// For a case like a sibling or staff-child discount that should apply every
// quarter, not just the one an admin happened to be looking at — see the
// Student model's discountType comment for how this differs from a one-off
// per-fee discount (applyFeeDiscount above): this is a template copied onto
// every future generateStudentFees call, not something that touches
// already-generated fees on its own.

export async function setStandingDiscount(studentId, { discountType, discountValue, discountReason }, actor) {
  if (!DISCOUNT_TYPES.includes(discountType)) throw new Error('Invalid discount type.');
  const value = Number(discountValue);
  if (!(value > 0)) throw new Error('Enter a positive discount value.');
  if (discountType === 'PERCENT' && value > 100) throw new Error('Percentage discount cannot exceed 100%.');

  const schoolId = await resolveSchoolId();
  const student = await getStudentById(studentId, schoolId);
  if (!student) throw new Error('Student not found.');

  const [row] = await prisma.$transaction([
    prisma.student.update({
      where: { id: studentId, schoolId },
      data: { discountType, discountValue: value, discountReason: discountReason?.trim() || null },
    }),
    logFeeAudit(prisma, schoolId, 'STANDING_DISCOUNT_SET', actor, {
      studentId,
      meta: { discountType, discountValue: value, reason: discountReason?.trim() || null },
    }),
  ]);
  return { discountType: row.discountType, discountValue: row.discountValue, discountReason: row.discountReason };
}

export async function removeStandingDiscount(studentId, actor) {
  const schoolId = await resolveSchoolId();
  const student = await getStudentById(studentId, schoolId);
  if (!student) throw new Error('Student not found.');

  await prisma.$transaction([
    prisma.student.update({
      where: { id: studentId, schoolId },
      data: { discountType: null, discountValue: null, discountReason: null },
    }),
    logFeeAudit(prisma, schoolId, 'STANDING_DISCOUNT_REMOVED', actor, { studentId }),
  ]);
  return { discountType: null, discountValue: null, discountReason: null };
}

// Explicit, one-click "catch up" action — copies the student's current
// standing discount onto every term already generated for them that hasn't
// been fully paid yet (a PAID fee is never touched; a PARTIAL fee is skipped,
// not failed, if this discount would drop its payable amount below what's
// already been collected — same rule as applyFeeDiscount, just non-fatal
// here since this runs across several fees at once).
export async function applyStandingDiscountToPendingFees(studentId) {
  const schoolId = await resolveSchoolId();
  const student = await getStudentById(studentId, schoolId);
  if (!student) throw new Error('Student not found.');
  if (!student.discountType || !student.discountValue) {
    throw new Error('No standing discount is set for this student.');
  }

  const fees = await prisma.studentFee.findMany({
    where: { studentId, schoolId, status: { in: ['PENDING', 'PARTIAL'] } },
  });

  let appliedCount = 0;
  let skippedCount = 0;
  for (const fee of fees) {
    const discountAmount =
      student.discountType === 'PERCENT' ? Math.round((fee.totalAmount * student.discountValue) / 100) : Math.min(student.discountValue, fee.totalAmount);
    const newPayable = fee.totalAmount - discountAmount;
    if (newPayable < fee.paidAmount) {
      skippedCount += 1;
      continue;
    }
    const newStatus = newPayable <= fee.paidAmount ? 'PAID' : fee.paidAmount > 0 ? 'PARTIAL' : 'PENDING';
    await prisma.studentFee.update({
      where: { id: fee.id, schoolId },
      data: {
        discountType: student.discountType,
        discountValue: student.discountValue,
        discountReason: student.discountReason,
        status: newStatus,
      },
    });
    appliedCount += 1;
  }

  return { appliedCount, skippedCount, totalConsidered: fees.length };
}

// Fire-and-forget, same convention as lib/homework.js's notifyHomeworkStudents
// — a notification-persistence/push hiccup must never fail the payment that
// already succeeded. `amount` is what this specific payment collected (not
// the fee's running total), so the parent sees "₹X received", not the whole
// remaining balance.
async function notifyPaymentConfirmed(schoolId, studentId, amount, newStatus) {
  createNotificationsForStudents(schoolId, [studentId], {
    type: 'fee',
    title: 'Payment received',
    message: `We received your payment of ₹${amount}.${newStatus === 'PAID' ? ' Fees are now fully paid.' : ''}`,
    link: '/parent/fees',
  });

  const parentLinks = await prisma.parentStudentLink.findMany({
    where: { studentId },
    select: { parentAccountId: true },
  });
  const parentAccountIds = [...new Set(parentLinks.map((l) => l.parentAccountId))];
  if (!parentAccountIds.length) return;

  const tokens = await getPushTokensForOwners('Parent', parentAccountIds);
  if (!tokens.length) return;

  const messages = tokens.map((token) => ({
    to: token,
    title: 'Payment received',
    body: `We received your payment of ₹${amount}.${newStatus === 'PAID' ? ' Fees are now fully paid.' : ''}`,
    data: { type: 'fee', studentId },
  }));
  await sendExpoPushNotifications(messages);
}

// ---- Payments ----

// A manual collection can be for less than the full remaining due amount —
// `amount` defaults to the full remaining due (existing full-payment callers
// keep working unchanged) but a caller can pass a smaller one to record a
// partial payment. `paidAmount` accumulates across multiple collections for
// the same fee (a second "partial" call tops up, not replaces); status
// becomes PAID only once the running total reaches totalAmount, PARTIAL
// otherwise. Both writes happen in one transaction so a crash between them
// can never leave a "paid but fee still pending" (or vice versa) state.
// Locks one StudentFee row for the rest of the caller's transaction and returns
// it freshly read. Every payment path (manual, bulk, online) goes through this,
// so two payments for the same fee can never both read the same "paid so far"
// and then both write — the second one waits here and sees the first one's
// result (DB-002, BIZ-003).
async function lockFeeRow(tx, schoolId, studentFeeId) {
  await tx.$queryRaw`SELECT id FROM "StudentFee" WHERE id = ${studentFeeId} AND "schoolId" = ${schoolId} FOR UPDATE`;
  return tx.studentFee.findFirst({ where: { id: studentFeeId, schoolId }, include: { items: true } });
}

// The next receipt number for this school. One atomic statement (insert-or-increment), run
// inside the payment's own transaction: two payments can never get the same number, and a
// payment that rolls back gives its number back, so there are no gaps.
async function nextReceiptNumber(tx, schoolId) {
  const rows = await tx.$queryRaw`INSERT INTO "ReceiptCounter" ("schoolId", "lastNumber") VALUES (${schoolId}, 1)
    ON CONFLICT ("schoolId") DO UPDATE SET "lastNumber" = "ReceiptCounter"."lastNumber" + 1 RETURNING "lastNumber"`;
  return rows[0].lastNumber;
}

// requirePermission's `user` (a real User.id, or a `legacyId` for an old session) as the columns
// the audit log and Payment.collectedBy* store.
function actorFields(actor) {
  return {
    actorId: actor?.id || actor?.legacyId || null,
    actorRole: actor?.roleKey || '',
    actorName: actor?.name || actor?.email || '',
  };
}

// Appends one FeeAuditLog row. Pass the transaction `tx` so it commits or rolls back together
// with the money change it describes.
function logFeeAudit(client, schoolId, action, actor, data = {}) {
  return client.feeAuditLog.create({ data: { schoolId, action, ...actorFields(actor), ...data } });
}

export async function collectManualPayment({ studentFeeId, method, amount, actor }) {
  if (!PAYMENT_METHODS.includes(method) || method === 'RAZORPAY') {
    throw new Error('Invalid payment method for manual collection.');
  }
  const schoolId = await resolveSchoolId();

  // Everything below runs in one transaction on a locked fee row: the "paid so
  // far" it works from cannot change underneath it, and the remaining-due cap
  // is checked against that fresh figure.
  const { payment, row, collectAmount, newPaidAmount, newStatus } = await prisma.$transaction(
    async (tx) => {
      const locked = await lockFeeRow(tx, schoolId, studentFeeId);
      if (!locked) throw new Error('Student fee record not found.');
      if (locked.status === 'PAID') throw new Error('This fee has already been paid.');

      const payable = payableAmountFor(locked);
      const remainingDue = payable - locked.paidAmount;
      const toCollect = amount === undefined || amount === null || amount === '' ? remainingDue : Number(amount);
      if (!(toCollect > 0)) throw new Error('Enter a valid positive amount.');
      if (toCollect > remainingDue) throw new Error(`Amount cannot exceed the remaining due (₹${remainingDue}).`);

      const paid = locked.paidAmount + toCollect;
      const status = paid >= payable ? 'PAID' : 'PARTIAL';

      const created = await tx.payment.create({
        data: {
          schoolId,
          studentId: locked.studentId,
          studentFeeId: locked.id,
          amount: toCollect,
          method,
          status: 'SUCCESS',
          paidAt: new Date(),
          receiptNumber: await nextReceiptNumber(tx, schoolId),
          collectedById: actorFields(actor).actorId,
          collectedByName: actorFields(actor).actorName || null,
        },
      });
      await tx.studentFee.update({ where: { id: locked.id, schoolId }, data: { paidAmount: paid, status } });
      await logFeeAudit(tx, schoolId, 'PAYMENT_COLLECTED', actor, {
        studentId: locked.studentId,
        studentFeeId: locked.id,
        paymentId: created.id,
        meta: { amount: toCollect, method, receiptNumber: created.receiptNumber },
      });
      return { payment: created, row: locked, collectAmount: toCollect, newPaidAmount: paid, newStatus: status };
    },
    { timeout: 15000 }
  );

  runAfterResponse(notifyPaymentConfirmed(schoolId, row.studentId, collectAmount, newStatus), 'notifyPaymentConfirmed failed');

  return {
    payment: {
      id: payment.id,
      studentId: payment.studentId,
      studentFeeId: payment.studentFeeId,
      amount: payment.amount,
      method: payment.method,
      status: payment.status,
      paidAt: payment.paidAt.toISOString().slice(0, 10),
      receiptNo: formatReceiptNo(payment.receiptNumber),
    },
    studentFee: decorateStudentFee({ ...row, paidAmount: newPaidAmount, status: newStatus, payments: [] }),
  };
}

// Bulk row-selection action on the Student Fees table — collects the full
// remaining due (never a partial amount; there's no per-student amount input
// in a bulk flow) for every PENDING/PARTIAL StudentFee belonging to the
// given students, across however many terms each of them owes. One Payment
// row per StudentFee collected, all in a single transaction.
export async function bulkCollectFullDue(studentIds, method, actor) {
  if (!PAYMENT_METHODS.includes(method) || method === 'RAZORPAY') {
    throw new Error('Invalid payment method for manual collection.');
  }
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    throw new Error('Select at least one student.');
  }

  const schoolId = await resolveSchoolId();
  const candidates = await prisma.studentFee.findMany({
    where: { schoolId, studentId: { in: studentIds }, status: { in: ['PENDING', 'PARTIAL'] } },
    select: { id: true },
  });

  if (candidates.length === 0) {
    return { collectedCount: 0, studentCount: 0, totalCollected: 0 };
  }

  // Each fee is locked and re-read inside the transaction, so a payment that
  // lands between the list above and this write is counted, not overwritten.
  const now = new Date();
  const collected = await prisma.$transaction(
    async (tx) => {
      const done = [];
      for (const { id } of candidates) {
        const fee = await lockFeeRow(tx, schoolId, id);
        if (!fee || fee.status === 'PAID') continue;
        const payable = payableAmountFor(fee);
        const due = payable - fee.paidAmount;
        if (!(due > 0)) continue;
        const created = await tx.payment.create({
          data: {
            schoolId,
            studentId: fee.studentId,
            studentFeeId: fee.id,
            amount: due,
            method,
            status: 'SUCCESS',
            paidAt: now,
            receiptNumber: await nextReceiptNumber(tx, schoolId),
            collectedById: actorFields(actor).actorId,
            collectedByName: actorFields(actor).actorName || null,
          },
        });
        await tx.studentFee.update({ where: { id: fee.id, schoolId }, data: { paidAmount: payable, status: 'PAID' } });
        await logFeeAudit(tx, schoolId, 'PAYMENT_COLLECTED', actor, {
          studentId: fee.studentId,
          studentFeeId: fee.id,
          paymentId: created.id,
          meta: { amount: due, method, receiptNumber: created.receiptNumber, bulk: true },
        });
        done.push({ studentId: fee.studentId, amount: due });
      }
      return done;
    },
    { timeout: 60000 }
  );

  for (const c of collected) {
    runAfterResponse(notifyPaymentConfirmed(schoolId, c.studentId, c.amount, 'PAID'), 'notifyPaymentConfirmed failed');
  }

  return {
    collectedCount: collected.length,
    studentCount: new Set(collected.map((c) => c.studentId)).size,
    totalCollected: collected.reduce((sum, c) => sum + c.amount, 0),
  };
}

// Cancels a manually collected payment (wrong amount, wrong student, entered twice). The
// payment row stays, marked REVERSED with who did it and why; the fee gets the amount back as
// "still due". Online (Razorpay) payments are refused here: the money has to be refunded from
// the Razorpay dashboard first, this only edits our own records.
export async function reversePayment({ paymentId, reason, actor }) {
  const why = typeof reason === 'string' ? reason.trim() : '';
  if (why.length < 3) throw new Error('Enter a reason for reversing this payment.');
  const schoolId = await resolveSchoolId();

  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Payment" WHERE id = ${paymentId} AND "schoolId" = ${schoolId} FOR UPDATE`;
      const payment = await tx.payment.findFirst({ where: { id: paymentId, schoolId } });
      if (!payment) throw new Error('Payment not found.');
      if (payment.status === 'REVERSED') throw new Error('This payment was already reversed.');
      if (payment.status !== 'SUCCESS') throw new Error('Only a successful payment can be reversed.');
      if (payment.method === 'RAZORPAY') {
        throw new Error('An online payment cannot be reversed here. Refund it from the Razorpay dashboard.');
      }

      const fee = await lockFeeRow(tx, schoolId, payment.studentFeeId);
      if (!fee) throw new Error('Student fee record not found.');
      const newPaidAmount = Math.max(fee.paidAmount - payment.amount, 0);
      const payable = payableAmountFor(fee);
      const newStatus = newPaidAmount >= payable ? 'PAID' : newPaidAmount > 0 ? 'PARTIAL' : 'PENDING';

      const who = actorFields(actor);
      const updated = await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'REVERSED', reversedAt: new Date(), reversedByName: who.actorName || null, reversalReason: why },
      });
      await tx.studentFee.update({ where: { id: fee.id, schoolId }, data: { paidAmount: newPaidAmount, status: newStatus } });
      await logFeeAudit(tx, schoolId, 'PAYMENT_REVERSED', actor, {
        studentId: fee.studentId,
        studentFeeId: fee.id,
        paymentId: payment.id,
        meta: { amount: payment.amount, method: payment.method, receiptNumber: payment.receiptNumber, reason: why },
      });
      return { payment: decoratePaymentRow(updated), studentFee: { id: fee.id, paidAmount: newPaidAmount, status: newStatus } };
    },
    { timeout: 15000 }
  );
}

// ---- Razorpay online payment ----

// Creates a real Razorpay order for the *server's* own record of this fee's
// amount — the request body from the client is just a studentFeeId, never an
// amount (Rule 3: never trust the frontend for payment amount). A PENDING
// Payment row is created alongside the order so verifyRazorpayPayment has
// something to check the order/payment pair against later; if the user
// abandons checkout, this row just stays PENDING (no cleanup job for that in
// this MVP).
export async function createRazorpayOrder(studentFeeId) {
  const schoolId = await resolveSchoolId();
  const fee = await getStudentFeeById(studentFeeId);
  if (!fee) throw new Error('Student fee record not found.');
  if (fee.status === 'PAID') throw new Error('This fee has already been paid.');

  // A PARTIAL fee (some collected manually already) only owes the remainder
  // online — charging the full totalAmount again would overcharge. Net of
  // any discount too.
  const remainingDue = fee.payableAmount - fee.paidAmount;
  const amountPaise = remainingDue * 100;
  if (amountPaise < 100) throw new Error('Amount must be at least ₹1.');

  // This school's own Razorpay account if it's set one (Super Admin →
  // Payment Settings), the platform-wide fallback otherwise — see
  // lib/razorpay.js's getRazorpayCredentials. `keyId` is handed back to the
  // client below so RazorpayPayButton.jsx opens Checkout against the right
  // account; it's not something a single build-time env var can cover
  // anymore now that it varies per school.
  const [razorpay, { keyId }] = await Promise.all([getRazorpayClient(schoolId), getRazorpayCredentials(schoolId)]);

  // Opening checkout twice (double tap, retry, two devices) used to create a new
  // order and a new PENDING payment every time. If an order for exactly this
  // amount was opened in the last 30 minutes and is still unpaid, hand that one
  // back instead of stacking another.
  const openOrder = await prisma.payment.findFirst({
    where: {
      schoolId,
      studentFeeId: fee.id,
      method: 'RAZORPAY',
      status: 'PENDING',
      amount: remainingDue,
      razorpayOrderId: { not: null },
      createdAt: { gt: new Date(Date.now() - 30 * 60 * 1000) },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (openOrder) {
    return { orderId: openOrder.razorpayOrderId, amount: amountPaise, currency: 'INR', keyId };
  }

  const order = await razorpay.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt: `fee_${fee.id}_${Date.now()}`,
  });

  await prisma.payment.create({
    data: {
      schoolId,
      studentId: fee.studentId,
      studentFeeId: fee.id,
      amount: remainingDue,
      method: 'RAZORPAY',
      status: 'PENDING',
      razorpayOrderId: order.id,
    },
  });

  return { orderId: order.id, amount: amountPaise, currency: order.currency, keyId };
}

// Verifies a completed Razorpay Standard Checkout and, only on success,
// marks the fee PAID — see Rules 3-8. Idempotent: a duplicate verify call
// (double-click, retry, or the same event arriving via both the checkout
// callback and a webhook once that's built) is detected via the PENDING
// Payment row already created by createRazorpayOrder and short-circuits
// instead of processing twice.
export async function verifyRazorpayPayment({ studentFeeId, razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  if (!studentFeeId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    throw new Error('Missing required payment details.');
  }

  const schoolId = await resolveSchoolId();
  const fee = await getStudentFeeById(studentFeeId);
  if (!fee) throw new Error('Student fee record not found.');

  // The order must be the one *we* created for *this* fee — not just any
  // valid Razorpay order id the client happens to send (Rule: "Verify
  // Razorpay order belongs to the expected fee").
  const payment = await prisma.payment.findFirst({
    where: { studentFeeId, razorpayOrderId, method: 'RAZORPAY', schoolId },
  });
  if (!payment) throw new Error('This payment order does not belong to the specified fee.');

  // Already processed (duplicate verify request, or fee already paid by the
  // time this one arrived) — return the existing state rather than
  // reprocessing or erroring.
  if (payment.status === 'SUCCESS') {
    return { payment: decoratePaymentRow(payment), studentFee: fee, alreadyProcessed: true };
  }

  const isValidSignature = await verifyRazorpaySignature({
    schoolId,
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
  });
  if (!isValidSignature) {
    await prisma.payment.update({ where: { id: payment.id, schoolId }, data: { status: 'FAILED' } });
    throw new Error('Payment verification failed — signature mismatch.');
  }

  try {
    const finalized = await finalizeRazorpayPayment({ schoolId, paymentId: payment.id, razorpayPaymentId });
    return {
      payment: decoratePaymentRow(finalized.payment),
      studentFee: { ...fee, paidAmount: finalized.newPaidAmount, status: finalized.newStatus },
      ...(finalized.alreadyProcessed ? { alreadyProcessed: true } : {}),
    };
  } catch (err) {
    // Another request (the webhook, say) already recorded this exact
    // razorpayPaymentId first — prevent a duplicate Payment row.
    if (isDuplicateError(err)) {
      const existing = await prisma.payment.findUnique({ where: { razorpayPaymentId } });
      return { payment: decoratePaymentRow(existing), studentFee: { ...fee, status: 'PAID' }, alreadyProcessed: true };
    }
    throw err;
  }
}

// Marks one pending Razorpay payment as successful and credits its fee, inside a
// transaction that locks the payment row and then the fee row. Used by the
// browser/app callback (verifyRazorpayPayment), the webhook and the nightly
// reconcile, so whichever arrives first wins and the others see "already done".
//
// The caller must already have proven the payment is real (signature or webhook
// signature or a fetch from Razorpay). If the fee was paid some other way in the
// meantime, the captured money is still recorded on the payment but only the
// remaining due is credited to the fee, and the difference is returned as
// `overpaidBy` (a refund is the school's call — there is no refund flow yet).
export async function finalizeRazorpayPayment({ schoolId, paymentId, razorpayPaymentId }) {
  const result = await prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Payment" WHERE id = ${paymentId} AND "schoolId" = ${schoolId} FOR UPDATE`;
      const payment = await tx.payment.findFirst({ where: { id: paymentId, schoolId } });
      if (!payment) throw new Error('Payment record not found.');
      if (payment.status === 'SUCCESS') {
        return { payment, alreadyProcessed: true };
      }

      const fee = await lockFeeRow(tx, schoolId, payment.studentFeeId);
      if (!fee) throw new Error('Student fee record not found.');

      const payable = payableAmountFor(fee);
      const remaining = Math.max(payable - fee.paidAmount, 0);
      const credited = Math.min(payment.amount, remaining);
      const newPaidAmount = fee.paidAmount + credited;
      const newStatus = newPaidAmount >= payable ? 'PAID' : 'PARTIAL';

      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'SUCCESS',
          razorpayPaymentId,
          paidAt: new Date(),
          receiptNumber: await nextReceiptNumber(tx, schoolId),
          collectedByName: 'Online (Razorpay)',
        },
      });
      await tx.studentFee.update({ where: { id: fee.id, schoolId }, data: { paidAmount: newPaidAmount, status: newStatus } });
      await logFeeAudit(tx, schoolId, 'PAYMENT_COLLECTED', null, {
        studentId: fee.studentId,
        studentFeeId: fee.id,
        paymentId: payment.id,
        meta: { amount: credited, method: 'RAZORPAY', receiptNumber: updatedPayment.receiptNumber },
      });

      return { payment: updatedPayment, studentId: fee.studentId, credited, overpaidBy: payment.amount - credited, newPaidAmount, newStatus };
    },
    { timeout: 15000 }
  );

  if (result.alreadyProcessed) {
    const fee = await prisma.studentFee.findFirst({ where: { id: result.payment.studentFeeId, schoolId } });
    return { payment: result.payment, alreadyProcessed: true, newPaidAmount: fee?.paidAmount ?? 0, newStatus: fee?.status ?? 'PAID' };
  }

  if (result.overpaidBy > 0) {
    console.warn(`Razorpay payment ${razorpayPaymentId} overpaid fee ${result.payment.studentFeeId} by ₹${result.overpaidBy}; refund needed.`);
  }
  runAfterResponse(notifyPaymentConfirmed(schoolId, result.studentId, result.credited, result.newStatus), 'notifyPaymentConfirmed failed');
  return result;
}

// A verified Razorpay webhook event (the route checks the signature first).
// Only successful-capture events matter; everything else is acknowledged and
// ignored so Razorpay does not keep retrying it.
export async function handleRazorpayWebhookEvent(event) {
  if (!['payment.captured', 'order.paid'].includes(event?.event)) return { handled: false, reason: 'event ignored' };
  const entity = event?.payload?.payment?.entity;
  if (!entity?.id || !entity?.order_id || entity.status !== 'captured') return { handled: false, reason: 'not a captured payment' };

  const payment = await prisma.payment.findUnique({ where: { razorpayOrderId: entity.order_id } });
  if (!payment) return { handled: false, reason: 'unknown order' };
  if (entity.amount !== payment.amount * 100) {
    console.error(`Razorpay webhook amount mismatch for order ${entity.order_id}: got ${entity.amount}, expected ${payment.amount * 100}`);
    return { handled: false, reason: 'amount mismatch' };
  }

  const result = await finalizeRazorpayPayment({ schoolId: payment.schoolId, paymentId: payment.id, razorpayPaymentId: entity.id });
  return { handled: true, alreadyProcessed: Boolean(result.alreadyProcessed) };
}

// Safety net for a callback AND a webhook that both never arrived: looks at
// Razorpay payments still PENDING after 30 minutes (and no older than a week),
// asks Razorpay what happened to each order, and records the ones that were
// captured. Run by the nightly cron.
export async function reconcilePendingRazorpayPayments({ limit = 100 } = {}) {
  const pending = await prisma.payment.findMany({
    where: {
      method: 'RAZORPAY',
      status: 'PENDING',
      razorpayOrderId: { not: null },
      createdAt: { lt: new Date(Date.now() - 30 * 60 * 1000), gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  let recovered = 0;
  let checked = 0;
  let errors = 0;
  for (const p of pending) {
    checked += 1;
    try {
      const razorpay = await getRazorpayClient(p.schoolId);
      const res = await razorpay.orders.fetchPayments(p.razorpayOrderId);
      const captured = (res?.items || []).find((i) => i.status === 'captured' && i.amount === p.amount * 100);
      if (!captured) continue;
      await finalizeRazorpayPayment({ schoolId: p.schoolId, paymentId: p.id, razorpayPaymentId: captured.id });
      recovered += 1;
    } catch (err) {
      errors += 1;
      console.error(`reconcile failed for payment ${p.id}`, err?.message || err);
    }
  }
  return { checked, recovered, errors };
}

function decoratePaymentRow(row) {
  return {
    id: row.id,
    studentId: row.studentId,
    studentFeeId: row.studentFeeId,
    amount: row.amount,
    method: row.method,
    status: row.status,
    razorpayOrderId: row.razorpayOrderId,
    razorpayPaymentId: row.razorpayPaymentId,
    paidAt: row.paidAt ? row.paidAt.toISOString().slice(0, 10) : null,
    receiptNo: formatReceiptNo(row.receiptNumber),
  };
}

export async function getPayments({ studentId = '', method = '', status = '', search = '', page = 1, pageSize = 20 } = {}) {
  const where = {
    schoolId: await resolveSchoolId(),
    ...(studentId ? { studentId } : {}),
    ...(method ? { method } : {}),
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { student: { firstName: { contains: search, mode: 'insensitive' } } },
            { student: { lastName: { contains: search, mode: 'insensitive' } } },
            { razorpayPaymentId: { contains: search, mode: 'insensitive' } },
            { razorpayOrderId: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: { student: true, studentFee: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.payment.count({ where }),
  ]);

  return { payments: rows.map(decoratePayment), total, page, pageSize };
}

// ---- Dashboard aggregation ----

// A term's own hard due date — the last day of its quarter (see
// feeConstants.js's TERM_LABELS) within the fee's own academic session.
// `academicSession` is "2026-27"; T1-T3 fall in the first calendar year,
// T4 in the second, since the school year starts in April.
function termEndDate(academicSession, term) {
  const [startYear] = academicSession.split('-').map(Number);
  const endings = {
    T1: `${startYear}-06-30`,
    T2: `${startYear}-09-30`,
    T3: `${startYear}-12-31`,
    T4: `${startYear + 1}-03-31`,
  };
  return endings[term] ? new Date(`${endings[term]}T23:59:59`) : null;
}

// Every dashboard "how much is owed" figure below (getFeesStats,
// getOverdueStudentCount, getDefaulterStudentIds, getClasswisePendingFees,
// getPendingFeesStudentCount, getPendingFeesList) needs each StudentFee's
// payable amount, which can't be a database SUM — a PERCENT discount and a
// per-item late fee (grace days, per-day rate, cap, today's date) are computed
// per row (see discountAmountFor / lateFeeAmountFor). So the math stays in JS,
// but the rows are loaded ONCE per request and shared (memoPerRequest — unlike
// React `cache`, it also dedupes inside Route Handlers such as
// /api/dashboard/overview; concurrent callers in the same Promise.all share
// the one in-flight promise) instead of every function re-reading the whole
// school's fees plus every fee item.
// Only the columns those calculations actually read are selected.
const loadSchoolFees = (schoolId) =>
  memoPerRequest(`schoolFees:${schoolId}`, () =>
    prisma.studentFee.findMany({
    where: { schoolId },
    select: {
      studentId: true,
      totalAmount: true,
      paidAmount: true,
      discountType: true,
      discountValue: true,
      academicSession: true,
      term: true,
      items: {
        select: { lateFeeEnabled: true, lateFeeGraceDays: true, lateFeeType: true, lateFeeAmount: true, lateFeeMaxAmount: true },
      },
      student: { select: { firstName: true, lastName: true, class: true, section: true } },
    },
  })
  );

export async function getFeesStats() {
  const schoolId = await resolveSchoolId();
  const fees = await loadSchoolFees(schoolId);
  const totalFees = fees.reduce((sum, fee) => sum + payableAmountFor(fee), 0);
  const collected = fees.reduce((sum, fee) => sum + fee.paidAmount, 0);

  // Overdue = a term whose own quarter has already ended with money still
  // owed on it — not simply "unpaid", since a term not due until next
  // quarter is just Pending, not Overdue.
  const now = new Date();
  const overdue = fees.reduce((sum, fee) => {
    const payable = payableAmountFor(fee);
    const due = payable - fee.paidAmount;
    if (due <= 0) return sum;
    const endDate = termEndDate(fee.academicSession, fee.term);
    return endDate && endDate < now ? sum + due : sum;
  }, 0);

  const recoveryPercent = totalFees > 0 ? Math.round((collected / totalFees) * 1000) / 10 : 0;

  return { totalFees, collected, pending: totalFees - collected, overdue, recoveryPercent };
}

// Fee Collection chart's Daily/Monthly/Yearly toggle (see
// FeeCollectionChart.jsx), all three series from one call.
// "Due" is real but a choice of definition, not a stored figure — the sum of
// each StudentFee's totalAmount bucketed by the day/month/session it was
// generated in (StudentFee.createdAt), i.e. "how much was billed in this
// period", not a live pending balance. "Collected" is the real sum of
// successful Payment rows bucketed by paidAt (daily/monthly) or by the fee's
// own academicSession (yearly) — never a fabricated series.
//
// Yearly is summed inside Postgres (one row per session comes back). Daily and
// monthly only ever look at the last 12 months, so only that window's rows
// (amount + date, nothing else) are loaded and bucketed here in local time —
// the same local-date bucketing the chart always used.
export async function getFeeCollectionTrends() {
  const schoolId = await resolveSchoolId();

  const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    return { key: monthKey(d), label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) };
  });
  const windowStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [dueBySession, collectedBySession, recentFees, recentPayments] = await Promise.all([
    prisma.studentFee.groupBy({ by: ['academicSession'], where: { schoolId }, _sum: { totalAmount: true } }),
    prisma.$queryRaw`
      SELECT sf."academicSession" AS session, COALESCE(SUM(p."amount"), 0)::bigint AS collected
      FROM "Payment" p
      JOIN "StudentFee" sf ON sf."id" = p."studentFeeId"
      WHERE p."schoolId" = ${schoolId} AND p."status" = 'SUCCESS'
      GROUP BY sf."academicSession"`,
    prisma.studentFee.findMany({ where: { schoolId, createdAt: { gte: windowStart } }, select: { totalAmount: true, createdAt: true } }),
    prisma.payment.findMany({
      where: { schoolId, status: 'SUCCESS', paidAt: { gte: windowStart } },
      select: { amount: true, paidAt: true },
    }),
  ]);

  const dueMap = new Map(dueBySession.map((row) => [row.academicSession, row._sum.totalAmount || 0]));
  const collectedMap = new Map(collectedBySession.map((row) => [row.session, Number(row.collected)]));
  const yearly = [...dueMap.keys()].sort().map((session) => ({
    label: session,
    due: dueMap.get(session),
    collected: collectedMap.get(session) || 0,
  }));

  const sumBy = (rows, dateField, amountField, keyOf, key) =>
    rows.filter((r) => r[dateField] && keyOf(new Date(r[dateField])) === key).reduce((sum, r) => sum + r[amountField], 0);

  // Last 14 real calendar days ending today, oldest first — unlike
  // attendance, a fee payment isn't tied to a school day, so Sunday isn't
  // skipped here.
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return { key: toLocalDateStr(d), label: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) };
  });
  const daily = days.map(({ key, label }) => ({
    label,
    due: sumBy(recentFees, 'createdAt', 'totalAmount', toLocalDateStr, key),
    collected: sumBy(recentPayments, 'paidAt', 'amount', toLocalDateStr, key),
  }));

  // Last 12 calendar months ending this month, oldest first.
  const monthly = months.map(({ key, label }) => ({
    label,
    due: sumBy(recentFees, 'createdAt', 'totalAmount', monthKey, key),
    collected: sumBy(recentPayments, 'paidAt', 'amount', monthKey, key),
  }));

  return { daily, monthly, yearly };
}

// Distinct students with at least one overdue term (see termEndDate above)
// — the Smart Alerts widget's "X students have overdue fees" figure, a
// headcount rather than getFeesStats' rupee `overdue` total.
export async function getOverdueStudentCount() {
  const schoolId = await resolveSchoolId();
  const fees = await loadSchoolFees(schoolId);
  const now = new Date();
  const overdueStudentIds = new Set();
  for (const fee of fees) {
    const due = payableAmountFor(fee) - fee.paidAmount;
    if (due <= 0) continue;
    const endDate = termEndDate(fee.academicSession, fee.term);
    if (endDate && endDate < now) overdueStudentIds.add(fee.studentId);
  }
  return overdueStudentIds.size;
}

// Same overdue definition as getOverdueStudentCount above, just the actual
// ids instead of a headcount — "Send Fees Reminder" modal's "Defaulters"
// target group.
export async function getDefaulterStudentIds() {
  const schoolId = await resolveSchoolId();
  const fees = await loadSchoolFees(schoolId);
  const now = new Date();
  const overdueStudentIds = new Set();
  for (const fee of fees) {
    const due = payableAmountFor(fee) - fee.paidAmount;
    if (due <= 0) continue;
    const endDate = termEndDate(fee.academicSession, fee.term);
    if (endDate && endDate < now) overdueStudentIds.add(fee.studentId);
  }
  return [...overdueStudentIds];
}

// Pending Fees KPI card's "View Classwise" popup — EVERY active class for
// the current session (same source ClassWiseStudentsModal.jsx's headcount
// chart uses), not just the ones with money owed — a fully-paid class shows
// up with ₹0, same "show every class, not just non-zero ones" convention.
// Same payable (discount + late fee aware) math as everywhere else, just
// grouped by `student.class` instead of summed flat.
export async function getClasswisePendingFees() {
  const schoolId = await resolveSchoolId();
  const { getActiveSession } = await import('./academicSessions');
  const { getClassesForSession } = await import('./classes');

  const activeSession = await getActiveSession();
  const activeClasses = activeSession ? await getClassesForSession(activeSession.name) : [];

  const byClass = new Map();
  for (const c of activeClasses.filter((c) => c.status === 'Active')) {
    byClass.set(c.name, { name: c.name, totalDue: 0, studentIds: new Set() });
  }

  const fees = await loadSchoolFees(schoolId);

  for (const fee of fees) {
    const due = payableAmountFor(fee) - fee.paidAmount;
    if (due <= 0 || !fee.student) continue;
    const className = fee.student.class;
    // A class with pending fees that isn't in the current session's active
    // list (e.g. a past session, or deactivated since) still gets counted
    // rather than silently dropped.
    if (!byClass.has(className)) byClass.set(className, { name: className, totalDue: 0, studentIds: new Set() });
    const entry = byClass.get(className);
    entry.totalDue += due;
    entry.studentIds.add(fee.studentId);
  }

  return [...byClass.values()]
    .map((entry) => ({ name: entry.name, totalDue: entry.totalDue, studentCount: entry.studentIds.size }))
    .sort((a, b) => b.totalDue - a.totalDue);
}

// Sum of successful payments collected in the current calendar month — the
// Fee Overview widget's "Collected This Month" figure, distinct from
// getFeesStats' all-time `collected` total above.
export async function getFeesCollectedThisMonth() {
  const schoolId = await resolveSchoolId();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const { _sum } = await prisma.payment.aggregate({
    where: { schoolId, status: 'SUCCESS', paidAt: { gte: startOfMonth } },
    _sum: { amount: true },
  });
  return _sum.amount ?? 0;
}

// Sum of successful payments actually collected today — the dashboard
// snapshot's "Fee Collection Today" figure, distinct from getFeesStats'
// all-time collected total above.
export async function getFeesCollectedToday() {
  const schoolId = await resolveSchoolId();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { _sum } = await prisma.payment.aggregate({
    where: { schoolId, status: 'SUCCESS', paidAt: { gte: startOfDay } },
    _sum: { amount: true },
  });
  return _sum.amount ?? 0;
}

// Distinct students with money owed on at least one term, due or not yet
// due — the Accountant dashboard's "Across N students" subtext under
// Pending Fees. Broader than getOverdueStudentCount (which only counts a
// term whose quarter has already ended).
export async function getPendingFeesStudentCount() {
  const schoolId = await resolveSchoolId();
  const fees = await loadSchoolFees(schoolId);
  const studentIds = new Set();
  for (const fee of fees) {
    if (payableAmountFor(fee) - fee.paidAmount > 0) studentIds.add(fee.studentId);
  }
  return studentIds.size;
}

// The Accountant dashboard's "Pending Fees" table — each student's single
// most urgent unpaid term (soonest/most-overdue due date first), not every
// unpaid term per student. `daysOverdue` is negative for a term not yet
// due (a due date in the future), matching the reference design's "13"/
// "16"/"18" days-overdue column — only actually-overdue rows would ever
// realistically show here since they're sorted first.
// `onlyOverdue` — the Dashboard's Fee Defaulters card's own use: only rows
// actually past their due date (daysOverdue > 0), never a term that's
// merely unpaid but not yet due. Without it, a school with fewer overdue
// students than `limit` would pad the list with not-actually-overdue rows,
// mislabeling them as defaulters.
export async function getPendingFeesList(limit = 3, { onlyOverdue = false } = {}) {
  const schoolId = await resolveSchoolId();
  const fees = await loadSchoolFees(schoolId);

  const now = new Date();
  const dueRows = fees
    .map((fee) => {
      const due = payableAmountFor(fee) - fee.paidAmount;
      if (due <= 0 || !fee.student) return null;
      const dueDate = termEndDate(fee.academicSession, fee.term);
      const daysOverdue = dueDate ? Math.floor((now - dueDate) / (24 * 60 * 60 * 1000)) : null;
      if (onlyOverdue && !(daysOverdue > 0)) return null;
      return {
        studentId: fee.studentId,
        name: `${fee.student.firstName} ${fee.student.lastName}`,
        class: fee.student.section ? `${fee.student.class} - ${fee.student.section}` : fee.student.class,
        dueAmount: due,
        dueDate: dueDate ? dueDate.toISOString().slice(0, 10) : null,
        daysOverdue,
      };
    })
    .filter(Boolean);

  // Most urgent (most days overdue) first; a term with no computable due
  // date sorts last rather than crashing the comparison.
  dueRows.sort((a, b) => (b.daysOverdue ?? -Infinity) - (a.daysOverdue ?? -Infinity));

  // Only one row per student — their single most urgent unpaid term.
  const seen = new Set();
  const rows = [];
  for (const row of dueRows) {
    if (seen.has(row.studentId)) continue;
    seen.add(row.studentId);
    rows.push(row);
    if (rows.length >= limit) break;
  }
  return rows;
}

// Fee Defaulters card's "Send Reminder" CTA — one real in-app Notice
// (Individual/Parent audience, same path createNotice already uses for a
// manually-posted notice) per parent linked to a student with a real
// unpaid balance. No email/SMS exists in this codebase yet (see
// lib/email.js — nodemailer wired up but no SMTP provider configured), so
// the in-app Notice + push/bell system is the only real delivery channel;
// this never pretends to send anything beyond that.
export async function sendFeeReminders(studentIds, currentUser) {
  const schoolId = await resolveSchoolId();
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    throw new Error('studentIds must be a non-empty array.');
  }

  const [students, fees, links] = await Promise.all([
    prisma.student.findMany({
      where: { id: { in: studentIds }, schoolId },
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.studentFee.findMany({
      where: { schoolId, studentId: { in: studentIds } },
      select: {
        studentId: true,
        totalAmount: true,
        paidAmount: true,
        discountType: true,
        discountValue: true,
        academicSession: true,
        term: true,
        items: true,
      },
    }),
    prisma.parentStudentLink.findMany({ where: { studentId: { in: studentIds } }, select: { studentId: true, parentAccountId: true } }),
  ]);

  // Per-term breakdown, not just a lump total — the reminder names each
  // quarter still owed (e.g. "Quarter 2 (July - September): ₹5,000"), so a
  // parent knows exactly which term(s) are due, not just a final figure.
  const termDuesByStudent = new Map();
  for (const fee of fees) {
    const due = payableAmountFor(fee) - fee.paidAmount;
    if (due <= 0) continue;
    if (!termDuesByStudent.has(fee.studentId)) termDuesByStudent.set(fee.studentId, []);
    termDuesByStudent.get(fee.studentId).push({ term: fee.term, due });
  }

  const parentIdsByStudent = new Map();
  for (const link of links) {
    if (!parentIdsByStudent.has(link.studentId)) parentIdsByStudent.set(link.studentId, []);
    parentIdsByStudent.get(link.studentId).push(link.parentAccountId);
  }

  const sent = [];
  const skipped = [];
  for (const student of students) {
    const termDues = termDuesByStudent.get(student.id) || [];
    const due = termDues.reduce((sum, t) => sum + t.due, 0);
    const name = `${student.firstName} ${student.lastName}`;
    if (due <= 0) {
      skipped.push({ studentId: student.id, name, reason: 'No pending fee due' });
      continue;
    }
    const parentIds = parentIdsByStudent.get(student.id) || [];
    if (parentIds.length === 0) {
      skipped.push({ studentId: student.id, name, reason: 'No linked parent account' });
      continue;
    }
    // "Quarter 2 (July - September): ₹5,000" per term still owed, then the
    // total — a single term just reads as one line, no redundant total.
    const termLines = termDues
      .map((t) => `${TERM_DISPLAY_NAMES[t.term]} (${TERM_LABELS[t.term]}): ₹${t.due.toLocaleString('en-IN')}`)
      .join(', ');
    const message =
      termDues.length > 1
        ? `This is a reminder that fees are due for ${name} — ${termLines}. Total due: ₹${due.toLocaleString('en-IN')}. Please clear the pending amount at the earliest.`
        : `This is a reminder that ${termLines} is due for ${name}. Please clear the pending amount at the earliest.`;
    for (const parentAccountId of parentIds) {
      await createNotice(
        {
          title: 'Fee Payment Reminder',
          message,
          audience: 'Individual',
          recipientType: 'Parent',
          recipientId: parentAccountId,
          priority: 'Important',
        },
        currentUser
      );
      sent.push({ studentId: student.id, name, parentAccountId, dueAmount: due });
    }
    // Student Fees table's "Reminded On" column — when this was last
    // actually sent, not just that it's configured/possible.
    const remindedAt = new Date();
    await prisma.student.update({ where: { id: student.id, schoolId }, data: { lastFeeReminderAt: remindedAt } });
    sent.forEach((s) => {
      if (s.studentId === student.id) s.remindedAt = remindedAt.toISOString();
    });
  }

  // Students passed in that don't even exist in this school (bad id, or
  // another school's id) — accounted for so the caller's counts add up.
  const foundIds = new Set(students.map((s) => s.id));
  for (const id of studentIds) {
    if (!foundIds.has(id)) skipped.push({ studentId: id, name: null, reason: 'Student not found' });
  }

  return { sent, skipped };
}
