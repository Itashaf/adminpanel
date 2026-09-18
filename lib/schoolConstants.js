// Split out of lib/school.js so this stays importable from a 'use client'
// component (PreferencesForm.jsx) without pulling in that file's Prisma +
// next/headers dependencies — same "constants must be Prisma-free to be
// client-safe" rule as lib/adminConstants.js/lib/feeConstants.js.
export const TIMEZONE_OPTIONS = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
  { value: 'Asia/Dhaka', label: 'Asia/Dhaka (BST)' },
  { value: 'Asia/Kathmandu', label: 'Asia/Kathmandu (NPT)' },
  { value: 'Europe/London', label: 'Europe/London (GMT)' },
  { value: 'America/New_York', label: 'America/New_York (EST)' },
];

export const CURRENCY_OPTIONS = [
  { value: 'INR', label: 'INR — Indian Rupee (₹)' },
  { value: 'USD', label: 'USD — US Dollar ($)' },
  { value: 'GBP', label: 'GBP — British Pound (£)' },
  { value: 'EUR', label: 'EUR — Euro (€)' },
  { value: 'AED', label: 'AED — UAE Dirham (د.إ)' },
];

export const DATE_FORMAT_OPTIONS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/03/2027)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (03/31/2027)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2027-03-31)' },
];
