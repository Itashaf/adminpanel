// Pure data, zero imports — split out of lib/teachers.js so client
// components (TeacherForm.jsx, TeachersToolbar.jsx) can use these without
// pulling in that module's Prisma/nodemailer/next-server dependency chain
// into the browser bundle. That chain (lib/email.js, ultimately nodemailer)
// isn't just unsafe there like next/headers is — nodemailer needs real
// Node built-ins (net/tls/fs/dns) with no browser stub at all, so Turbopack
// can't even build a client chunk that merely *references* it, dynamic
// import included. Same split as lib/classConstants.js/lib/feeConstants.js.
export const EMPLOYMENT_TYPES = ['Full Time', 'Part Time', 'Contract', 'Guest'];
export const TEACHER_STATUSES = ['Active', 'Inactive'];
export const GENDERS = ['Male', 'Female', 'Other'];
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const ACCOUNT_STATUSES = ['Active', 'Suspended'];
export const MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widowed'];
export const EMERGENCY_RELATIONSHIPS = ['Spouse', 'Parent', 'Sibling', 'Child', 'Friend', 'Other'];
