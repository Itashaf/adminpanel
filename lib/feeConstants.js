// Pure data, zero imports — deliberately split out of lib/fees.js so client
// components can use these constants without pulling in that module's
// Prisma/Razorpay server-only dependency chain into the browser bundle (that
// chain crashes at runtime client-side since RAZORPAY_KEY_SECRET is never
// exposed there, and even the DB connection has no reason to ship to the
// browser). lib/fees.js re-exports these too, so server code can still
// `import { FEE_TERMS } from './fees'` without knowing this split exists.
export const FEE_TERMS = ['T1', 'T2', 'T3', 'T4'];

export const TERM_LABELS = {
  T1: 'April - June',
  T2: 'July - September',
  T3: 'October - December',
  T4: 'January - March',
};

// User-facing name for each term code — quarters, not the raw "T1" etc.
// enum value (kept as-is so existing FeeStructure/StudentFee rows in the DB
// stay valid; this is purely a display-layer rename).
export const TERM_DISPLAY_NAMES = {
  T1: 'Quarter 1',
  T2: 'Quarter 2',
  T3: 'Quarter 3',
  T4: 'Quarter 4',
};

export const PAYMENT_METHODS = ['CASH', 'UPI', 'RAZORPAY', 'BANK_TRANSFER'];
