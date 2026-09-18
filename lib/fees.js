import prisma from './db';
import { resolveSchoolId } from './auth/schoolContext';
import { getAllStudents, getStudentById } from './students';
import razorpay, { verifyRazorpaySignature } from './razorpay';
import { FEE_TERMS, PAYMENT_METHODS, TERM_DISPLAY_NAMES } from './feeConstants';
import { createNotificationsForStudents } from './parentNotifications';
import { getPushTokensForOwners } from './pushTokens';
import { sendExpoPushNotifications } from './expoPush';

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
  for (const t of row.terms || []) {
    terms[t.term] = t.items.map(decorateFeeStructureItem);
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

function decorateStudentFee(row) {
  const discountAmount = discountAmountFor(row);
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
    payableAmount: row.totalAmount - discountAmount,
    items: (row.items || []).map((item) => ({ id: item.id, name: item.name, amount: item.amount })),
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
    paidAt: row.paidAt ? row.paidAt.toISOString().slice(0, 10) : null,
    createdAt: row.createdAt.toISOString().slice(0, 10),
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
function toTermsCreateData(terms) {
  return FEE_TERMS.filter((term) => (terms[term] || []).length > 0).map((term) => ({
    term,
    items: { create: terms[term].map(toItemCreateData) },
  }));
}

// The earliest term (T1..T4 order) that actually has fee items — `terms`
// always has at least one somewhere (validateTerms already enforced that),
// but not necessarily T1 itself (an admin could configure only Q2 onward).
function firstConfiguredTerm(terms) {
  return FEE_TERMS.find((term) => (terms[term] || []).length > 0);
}

async function createOneFeeStructure(schoolId, { academicSession, className, name, terms }) {
  const row = await prisma.feeStructure.create({
    data: {
      schoolId,
      academicSession,
      className,
      name: name || `${className} Fee Structure`,
      terms: { create: toTermsCreateData(terms) },
    },
    include: FEE_STRUCTURE_INCLUDE,
  });

  // Auto-bill the class's students for the earliest configured quarter right
  // away, rather than leaving a freshly-created structure inert until the
  // admin separately remembers to click "Generate Fees" — best-effort: a
  // generation hiccup (no active students in this class yet, say) must never
  // fail the structure's own creation, which already succeeded above.
  const firstTerm = firstConfiguredTerm(terms);
  if (firstTerm) {
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
  const created = [];
  const skipped = [];
  for (const className of classNames) {
    try {
      created.push(await createOneFeeStructure(schoolId, { ...data, className }));
    } catch (err) {
      const reason = isDuplicateError(err)
        ? `A fee structure for ${className} in ${data.academicSession} already exists.`
        : err.message;
      skipped.push({ className, reason });
    }
  }
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
          terms: { create: toTermsCreateData(data.terms) },
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
  const allStudents = await getAllStudents(schoolId);
  const eligibleStudents = allStudents.filter(
    (s) => s.class === structure.className && s.academicSession === structure.academicSession && s.status === 'Active'
  );

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
  const itemsCreateData = items.map((item) => ({ name: item.name, amount: item.amount }));

  await prisma.$transaction([
    ...toCreate.map((student) =>
      prisma.studentFee.create({
        data: {
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
          items: { create: itemsCreateData },
        },
      })
    ),
    ...toUpdate.map((row) =>
      prisma.studentFee.update({
        where: { id: row.id },
        data: { totalAmount, items: { deleteMany: {}, create: itemsCreateData } },
      })
    ),
  ]);

  return {
    generatedCount: toCreate.length,
    updatedCount: toUpdate.length,
    skippedCount: alreadyPaidCount,
    totalEligible: eligibleStudents.length,
  };
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
    select: { totalAmount: true, paidAmount: true, discountType: true, discountValue: true },
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
    const payable = fee.totalAmount - discountAmountFor(fee);
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

// Per-student fee summary for the Student Fees table — one row per Active
// student (across ALL their generated terms for the given academic session,
// not one term at a time), with a derived overall status:
// - 'NO_FEES': nothing generated for them yet (excluded from the table by
//   the caller unless explicitly asked for — see className/section filters)
// - 'DUE': generated but nothing paid
// - 'PARTIAL': some paid, some still owed
// - 'PAID': fully paid
// Class/section/search filter the *student* list; `status` filters on the
// derived status above, applied after the per-student totals are computed
// (can't push it into the DB query since it's derived across multiple rows).
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
  const allStudents = await getAllStudents(schoolId);
  let candidates = allStudents.filter((s) => s.status === 'Active');
  if (academicSession) candidates = candidates.filter((s) => s.academicSession === academicSession);
  if (className) candidates = candidates.filter((s) => s.class === className);
  if (section) candidates = candidates.filter((s) => s.section === section);
  if (search) {
    const q = search.trim().toLowerCase();
    // A transaction id (Razorpay's payment id) doesn't live on Student at
    // all — resolve it to the paying student(s) via Payment first, then
    // fold that into the same name/admission-id search so one search box
    // covers "find this student" and "who made this payment" alike.
    const paymentMatches = await prisma.payment.findMany({
      where: { schoolId, razorpayPaymentId: { contains: search.trim(), mode: 'insensitive' } },
      select: { studentId: true },
    });
    const paymentStudentIds = new Set(paymentMatches.map((p) => p.studentId));
    candidates = candidates.filter(
      (s) =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        s.admissionId.toLowerCase().includes(q) ||
        paymentStudentIds.has(s.id)
    );
  }

  if (candidates.length === 0) return { rows: [], total: 0, page, pageSize };

  const fees = await prisma.studentFee.findMany({
    where: {
      schoolId,
      studentId: { in: candidates.map((s) => s.id) },
      ...(academicSession ? { academicSession } : {}),
    },
    select: { studentId: true, totalAmount: true, paidAmount: true, discountType: true, discountValue: true },
  });
  // Same per-term derivation as getStudentFeeSummary — PARTIAL only when a
  // term itself was paid less than its own amount, never from one paid term
  // plus one untouched term summing into a false partial.
  const totalsByStudent = new Map();
  for (const fee of fees) {
    const entry = totalsByStudent.get(fee.studentId) || { totalFee: 0, paid: 0, hasPartialTerm: false, hasDueTerm: false };
    const payable = fee.totalAmount - discountAmountFor(fee);
    entry.totalFee += payable;
    entry.paid += fee.paidAmount;
    if (fee.paidAmount > 0 && fee.paidAmount < payable) entry.hasPartialTerm = true;
    else if (fee.paidAmount <= 0 && payable > 0) entry.hasDueTerm = true;
    totalsByStudent.set(fee.studentId, entry);
  }

  let rows = candidates.map((s) => {
    const totals = totalsByStudent.get(s.id) || { totalFee: 0, paid: 0, hasPartialTerm: false, hasDueTerm: false };
    const due = totals.totalFee - totals.paid;
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
      due,
      feeStatus,
    };
  });

  if (status) rows = rows.filter((r) => r.feeStatus === status);

  if (sortBy === 'paid' || sortBy === 'due') {
    const dir = sortDir === 'asc' ? 1 : -1;
    rows = [...rows].sort((a, b) => (a[sortBy] - b[sortBy]) * dir);
  }

  const total = rows.length;
  const start = (page - 1) * pageSize;
  return { rows: rows.slice(start, start + pageSize), total, page, pageSize };
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
export async function applyFeeDiscount(studentFeeId, { discountType, discountValue, discountReason }) {
  if (!DISCOUNT_TYPES.includes(discountType)) throw new Error('Invalid discount type.');
  const value = Number(discountValue);
  if (!(value > 0)) throw new Error('Enter a positive discount value.');
  if (discountType === 'PERCENT' && value > 100) throw new Error('Percentage discount cannot exceed 100%.');

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

  const newStatus = newPayable <= fee.paidAmount ? 'PAID' : fee.paidAmount > 0 ? 'PARTIAL' : 'PENDING';
  const row = await prisma.studentFee.update({
    where: { id: fee.id },
    data: { discountType, discountValue: value, discountReason: discountReason?.trim() || null, status: newStatus },
    include: { items: true },
  });
  return decorateStudentFee(row);
}

export async function removeFeeDiscount(studentFeeId) {
  const fee = await getStudentFeeById(studentFeeId);
  if (!fee) throw new Error('Student fee record not found.');

  const newStatus = fee.paidAmount >= fee.totalAmount ? 'PAID' : fee.paidAmount > 0 ? 'PARTIAL' : 'PENDING';
  const row = await prisma.studentFee.update({
    where: { id: fee.id },
    data: { discountType: null, discountValue: null, discountReason: null, status: newStatus },
    include: { items: true },
  });
  return decorateStudentFee(row);
}

// ---- Standing (student-level, recurring) discount ----
// For a case like a sibling or staff-child discount that should apply every
// quarter, not just the one an admin happened to be looking at — see the
// Student model's discountType comment for how this differs from a one-off
// per-fee discount (applyFeeDiscount above): this is a template copied onto
// every future generateStudentFees call, not something that touches
// already-generated fees on its own.

export async function setStandingDiscount(studentId, { discountType, discountValue, discountReason }) {
  if (!DISCOUNT_TYPES.includes(discountType)) throw new Error('Invalid discount type.');
  const value = Number(discountValue);
  if (!(value > 0)) throw new Error('Enter a positive discount value.');
  if (discountType === 'PERCENT' && value > 100) throw new Error('Percentage discount cannot exceed 100%.');

  const schoolId = await resolveSchoolId();
  const student = await getStudentById(studentId, schoolId);
  if (!student) throw new Error('Student not found.');

  const row = await prisma.student.update({
    where: { id: studentId },
    data: { discountType, discountValue: value, discountReason: discountReason?.trim() || null },
  });
  return { discountType: row.discountType, discountValue: row.discountValue, discountReason: row.discountReason };
}

export async function removeStandingDiscount(studentId) {
  const schoolId = await resolveSchoolId();
  const student = await getStudentById(studentId, schoolId);
  if (!student) throw new Error('Student not found.');

  await prisma.student.update({
    where: { id: studentId },
    data: { discountType: null, discountValue: null, discountReason: null },
  });
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
      where: { id: fee.id },
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
export async function collectManualPayment({ studentFeeId, method, amount }) {
  if (!PAYMENT_METHODS.includes(method) || method === 'RAZORPAY') {
    throw new Error('Invalid payment method for manual collection.');
  }
  const fee = await getStudentFeeById(studentFeeId);
  if (!fee) throw new Error('Student fee record not found.');
  if (fee.status === 'PAID') throw new Error('This fee has already been paid.');

  const remainingDue = fee.payableAmount - fee.paidAmount;
  const collectAmount = amount === undefined || amount === null || amount === '' ? remainingDue : Number(amount);
  if (!(collectAmount > 0)) throw new Error('Enter a valid positive amount.');
  if (collectAmount > remainingDue) throw new Error(`Amount cannot exceed the remaining due (₹${remainingDue}).`);

  const newPaidAmount = fee.paidAmount + collectAmount;
  const newStatus = newPaidAmount >= fee.payableAmount ? 'PAID' : 'PARTIAL';

  const [payment] = await prisma.$transaction([
    prisma.payment.create({
      data: {
        schoolId: await resolveSchoolId(),
        studentId: fee.studentId,
        studentFeeId: fee.id,
        amount: collectAmount,
        method,
        status: 'SUCCESS',
        paidAt: new Date(),
      },
    }),
    prisma.studentFee.update({
      where: { id: fee.id },
      data: { paidAmount: newPaidAmount, status: newStatus },
    }),
  ]);

  notifyPaymentConfirmed(await resolveSchoolId(), fee.studentId, collectAmount, newStatus).catch((err) =>
    console.error('notifyPaymentConfirmed failed', err)
  );

  return {
    payment: {
      id: payment.id,
      studentId: payment.studentId,
      studentFeeId: payment.studentFeeId,
      amount: payment.amount,
      method: payment.method,
      status: payment.status,
      paidAt: payment.paidAt.toISOString().slice(0, 10),
    },
    studentFee: { ...fee, paidAmount: newPaidAmount, status: newStatus },
  };
}

// Bulk row-selection action on the Student Fees table — collects the full
// remaining due (never a partial amount; there's no per-student amount input
// in a bulk flow) for every PENDING/PARTIAL StudentFee belonging to the
// given students, across however many terms each of them owes. One Payment
// row per StudentFee collected, all in a single transaction.
export async function bulkCollectFullDue(studentIds, method) {
  if (!PAYMENT_METHODS.includes(method) || method === 'RAZORPAY') {
    throw new Error('Invalid payment method for manual collection.');
  }
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    throw new Error('Select at least one student.');
  }

  const schoolId = await resolveSchoolId();
  const fees = await prisma.studentFee.findMany({
    where: { schoolId, studentId: { in: studentIds }, status: { in: ['PENDING', 'PARTIAL'] } },
  });

  if (fees.length === 0) {
    return { collectedCount: 0, studentCount: 0, totalCollected: 0 };
  }

  const now = new Date();
  await prisma.$transaction([
    ...fees.map((fee) =>
      prisma.payment.create({
        data: {
          schoolId,
          studentId: fee.studentId,
          studentFeeId: fee.id,
          amount: fee.totalAmount - discountAmountFor(fee) - fee.paidAmount,
          method,
          status: 'SUCCESS',
          paidAt: now,
        },
      })
    ),
    ...fees.map((fee) =>
      prisma.studentFee.update({
        where: { id: fee.id },
        data: { paidAmount: fee.totalAmount - discountAmountFor(fee), status: 'PAID' },
      })
    ),
  ]);

  for (const fee of fees) {
    const collected = fee.totalAmount - discountAmountFor(fee) - fee.paidAmount;
    notifyPaymentConfirmed(schoolId, fee.studentId, collected, 'PAID').catch((err) =>
      console.error('notifyPaymentConfirmed failed', err)
    );
  }

  return {
    collectedCount: fees.length,
    studentCount: new Set(fees.map((fee) => fee.studentId)).size,
    totalCollected: fees.reduce((sum, fee) => sum + (fee.totalAmount - discountAmountFor(fee) - fee.paidAmount), 0),
  };
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
  const fee = await getStudentFeeById(studentFeeId);
  if (!fee) throw new Error('Student fee record not found.');
  if (fee.status === 'PAID') throw new Error('This fee has already been paid.');

  // A PARTIAL fee (some collected manually already) only owes the remainder
  // online — charging the full totalAmount again would overcharge. Net of
  // any discount too.
  const remainingDue = fee.payableAmount - fee.paidAmount;
  const amountPaise = remainingDue * 100;
  if (amountPaise < 100) throw new Error('Amount must be at least ₹1.');

  const order = await razorpay.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt: `fee_${fee.id}_${Date.now()}`,
  });

  await prisma.payment.create({
    data: {
      schoolId: await resolveSchoolId(),
      studentId: fee.studentId,
      studentFeeId: fee.id,
      amount: remainingDue,
      method: 'RAZORPAY',
      status: 'PENDING',
      razorpayOrderId: order.id,
    },
  });

  return { orderId: order.id, amount: amountPaise, currency: order.currency };
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

  const fee = await getStudentFeeById(studentFeeId);
  if (!fee) throw new Error('Student fee record not found.');

  // The order must be the one *we* created for *this* fee — not just any
  // valid Razorpay order id the client happens to send (Rule: "Verify
  // Razorpay order belongs to the expected fee").
  const payment = await prisma.payment.findFirst({
    where: { studentFeeId, razorpayOrderId, method: 'RAZORPAY' },
  });
  if (!payment) throw new Error('This payment order does not belong to the specified fee.');

  // Already processed (duplicate verify request, or fee already paid by the
  // time this one arrived) — return the existing state rather than
  // reprocessing or erroring.
  if (payment.status === 'SUCCESS') {
    return { payment: decoratePaymentRow(payment), studentFee: fee, alreadyProcessed: true };
  }

  const isValidSignature = verifyRazorpaySignature({
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
  });
  if (!isValidSignature) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
    throw new Error('Payment verification failed — signature mismatch.');
  }

  // The amount was fixed server-side at order-creation time (createRazorpayOrder
  // reads it from this same StudentFee, never from the client) and Razorpay's
  // signature ties payment_id to that exact order_id — so a valid signature
  // here already guarantees the paid amount matches what we charged for,
  // with no separate amount check needed.
  try {
    const newPaidAmount = fee.paidAmount + payment.amount;
    const newStatus = newPaidAmount >= fee.payableAmount ? 'PAID' : 'PARTIAL';
    const [updatedPayment] = await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'SUCCESS', razorpayPaymentId, paidAt: new Date() },
      }),
      prisma.studentFee.update({
        where: { id: fee.id },
        data: { paidAmount: newPaidAmount, status: newStatus },
      }),
    ]);

    notifyPaymentConfirmed(await resolveSchoolId(), fee.studentId, payment.amount, newStatus).catch((err) =>
      console.error('notifyPaymentConfirmed failed', err)
    );

    return {
      payment: decoratePaymentRow(updatedPayment),
      studentFee: { ...fee, paidAmount: newPaidAmount, status: newStatus },
    };
  } catch (err) {
    // Another request (e.g. a webhook, once built) already recorded this
    // exact razorpayPaymentId first — Rule 8, prevent duplicate Payment rows.
    if (isDuplicateError(err)) {
      const existing = await prisma.payment.findUnique({ where: { razorpayPaymentId } });
      return { payment: decoratePaymentRow(existing), studentFee: { ...fee, status: 'PAID' }, alreadyProcessed: true };
    }
    throw err;
  }
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
  };
}

export async function getPayments({ studentId = '', method = '', status = '', page = 1, pageSize = 20 } = {}) {
  const where = {
    schoolId: await resolveSchoolId(),
    ...(studentId ? { studentId } : {}),
    ...(method ? { method } : {}),
    ...(status ? { status } : {}),
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

export async function getFeesStats() {
  const schoolId = await resolveSchoolId();
  // Can't use prisma.aggregate here — the discount needs per-row computation
  // (a PERCENT discount isn't a stored rupee amount, see discountAmountFor).
  const fees = await prisma.studentFee.findMany({
    where: { schoolId },
    select: { totalAmount: true, paidAmount: true, discountType: true, discountValue: true, academicSession: true, term: true },
  });
  const totalFees = fees.reduce((sum, fee) => sum + (fee.totalAmount - discountAmountFor(fee)), 0);
  const collected = fees.reduce((sum, fee) => sum + fee.paidAmount, 0);

  // Overdue = a term whose own quarter has already ended with money still
  // owed on it — not simply "unpaid", since a term not due until next
  // quarter is just Pending, not Overdue.
  const now = new Date();
  const overdue = fees.reduce((sum, fee) => {
    const payable = fee.totalAmount - discountAmountFor(fee);
    const due = payable - fee.paidAmount;
    if (due <= 0) return sum;
    const endDate = termEndDate(fee.academicSession, fee.term);
    return endDate && endDate < now ? sum + due : sum;
  }, 0);

  const recoveryPercent = totalFees > 0 ? Math.round((collected / totalFees) * 1000) / 10 : 0;

  return { totalFees, collected, pending: totalFees - collected, overdue, recoveryPercent };
}

// Distinct students with at least one overdue term (see termEndDate above)
// — the Smart Alerts widget's "X students have overdue fees" figure, a
// headcount rather than getFeesStats' rupee `overdue` total.
export async function getOverdueStudentCount() {
  const schoolId = await resolveSchoolId();
  const fees = await prisma.studentFee.findMany({
    where: { schoolId },
    select: { studentId: true, totalAmount: true, paidAmount: true, discountType: true, discountValue: true, academicSession: true, term: true },
  });
  const now = new Date();
  const overdueStudentIds = new Set();
  for (const fee of fees) {
    const due = fee.totalAmount - discountAmountFor(fee) - fee.paidAmount;
    if (due <= 0) continue;
    const endDate = termEndDate(fee.academicSession, fee.term);
    if (endDate && endDate < now) overdueStudentIds.add(fee.studentId);
  }
  return overdueStudentIds.size;
}

// Sum of successful payments collected in the current calendar month — the
// Fee Overview widget's "Collected This Month" figure, distinct from
// getFeesStats' all-time `collected` total above.
export async function getFeesCollectedThisMonth() {
  const schoolId = await resolveSchoolId();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const payments = await prisma.payment.findMany({
    where: { schoolId, status: 'SUCCESS', paidAt: { gte: startOfMonth } },
    select: { amount: true },
  });
  return payments.reduce((sum, p) => sum + p.amount, 0);
}

// Sum of successful payments actually collected today — the dashboard
// snapshot's "Fee Collection Today" figure, distinct from getFeesStats'
// all-time collected total above.
export async function getFeesCollectedToday() {
  const schoolId = await resolveSchoolId();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const payments = await prisma.payment.findMany({
    where: { schoolId, status: 'SUCCESS', paidAt: { gte: startOfDay } },
    select: { amount: true },
  });
  return payments.reduce((sum, p) => sum + p.amount, 0);
}
