import { z } from 'zod';

// How many sections a class has is now the admin's own choice per school (0,
// 1, or many — see lib/classes.js's getClassSectionsMap), not a fixed list
// per class name, so this can't be a static check anymore. Every schema
// below that validates a class+section pair takes the caller's live
// `classSections` map (from lib/hooks/useClassSections.js) as a parameter and
// builds the actual zod schema from it, so "Section is required" only fires
// for a class that currently has real sections to pick from.
function classHasSections(classSections, className) {
  return (classSections[className] || []).length > 0;
}

const AADHAAR_REGEX = /^\d{4}\s?\d{4}\s?\d{4}$/;

const aadhaarNumberField = z
  .string()
  .min(1, 'Aadhaar number is required.')
  .regex(AADHAAR_REGEX, 'Enter a valid 12-digit Aadhaar number.');

const aadhaarDocumentField = z.custom(
  (val) => (typeof File !== 'undefined' && val instanceof File) || (typeof val === 'string' && val.length > 0),
  { message: 'Aadhaar card upload is required.' }
);

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

const panNumberField = z
  .string()
  .optional()
  .or(z.literal(''))
  .refine((val) => !val || PAN_REGEX.test(val), { message: 'Enter a valid PAN (e.g. ABCDE1234F).' });

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required.').email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.').min(6, 'Password must be at least 6 characters.'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required.').email('Enter a valid email address.'),
});

export const setPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string().min(1, 'Confirm your password.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

const guardianSchema = z.object({
  relationship: z.string().min(1, 'Relationship is required.'),
  fullName: z.string().min(1, 'Full name is required.'),
  phone: z.string().min(10, 'Enter a valid phone number.'),
  email: z.string().email('Enter a valid email address.').optional().or(z.literal('')),
  occupation: z.string().optional(),
  aadhaarNumber: aadhaarNumberField,
  aadhaarDocument: aadhaarDocumentField,
});

const secondaryGuardianSchema = z.object({
  relationship: z.string().optional().or(z.literal('')),
  fullName: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  email: z.string().email('Enter a valid email address.').optional().or(z.literal('')),
  occupation: z.string().optional(),
  aadhaarNumber: z.string().optional().or(z.literal('')),
  aadhaarDocument: z.any().optional(),
});

export const teacherSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  middleName: z.string().optional(),
  lastName: z.string().min(1, 'Last name is required.'),
  dob: z.string().min(1, 'Date of birth is required.'),
  gender: z.string().min(1, 'Gender is required.'),
  bloodGroup: z.string().optional(),
  phone: z.string().min(10, 'Enter a valid phone number.'),
  email: z.string().min(1, 'Email is required.').email('Enter a valid email address.'),
  aadhaarNumber: aadhaarNumberField,
  aadhaarDocument: aadhaarDocumentField,
  maritalStatus: z.string().optional().or(z.literal('')),
  nationality: z.string().optional(),
  panNumber: panNumberField,

  employeeId: z.string().min(1, 'Employee ID is required.'),
  joiningDate: z.string().min(1, 'Joining date is required.'),
  relievingDate: z.string().optional().or(z.literal('')),
  qualification: z.string().min(1, 'Qualification is required.'),
  specialization: z.string().optional(),
  experience: z.string().optional(),
  employmentType: z.string().min(1, 'Employment type is required.'),
  status: z.string().optional(),

  tenthPercentage: z.string().optional(),
  twelfthPercentage: z.string().optional(),
  graduationDegree: z.string().optional(),
  graduationUniversity: z.string().optional(),

  bankAccountHolderName: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankIFSC: z.string().optional(),

  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelationship: z.string().optional().or(z.literal('')),

  loginEmail: z.string().email('Enter a valid email address.').optional().or(z.literal('')),
  accountStatus: z.string().optional(),

  addressLine1: z.string().optional().or(z.literal('')),
  addressLine2: z.string().optional(),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  pinCode: z.string().optional().or(z.literal('')),
});

export const classSchema = z.object({
  level: z.string().min(1, 'Class level is required.'),
  name: z.string().optional(),
  academicSession: z.string().min(1, 'Academic session is required.'),
  status: z.string().optional(),
  subjects: z.array(z.string()).optional().default([]),
});

export const sectionSchema = z.object({
  name: z.string().min(1, 'Section name is required.'),
  classTeacherId: z.string().optional().or(z.literal('')),
  room: z.string().optional().or(z.literal('')),
  capacity: z
    .string()
    .min(1, 'Maximum capacity is required.')
    .refine((val) => !Number.isNaN(Number(val)) && Number(val) > 0, { message: 'Enter a valid capacity.' }),
  status: z.string().optional(),
});

export const assignSectionTeacherSchema = z.object({
  classTeacherId: z.string().min(1, 'Please select a teacher.'),
});

export const academicSessionSchema = z
  .object({
    name: z.string().optional().or(z.literal('')),
    startDate: z.string().min(1, 'Start date is required.'),
    endDate: z.string().min(1, 'End date is required.'),
    description: z.string().optional(),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: 'End date must be after start date.',
    path: ['endDate'],
  });

const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{6})$/;
const ID_PREFIX_REGEX = /^[A-Za-z]{2,6}$/;

export const schoolProfileSchema = z.object({
  name: z.string().min(1, 'School name is required.'),
  code: z.string().min(1, 'School code is required.'),
  principalName: z.string().optional(),
  email: z.string().min(1, 'School email is required.').email('Enter a valid email address.'),
  phone: z.string().min(10, 'Enter a valid phone number.'),
  website: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || /^https?:\/\/.+\..+/.test(val), { message: 'Enter a valid URL (e.g. https://example.com).' }),
});

export const schoolContactSchema = z.object({
  addressLine1: z.string().min(1, 'Address line 1 is required.'),
  addressLine2: z.string().optional(),
  city: z.string().min(1, 'City is required.'),
  state: z.string().min(1, 'State is required.'),
  country: z.string().min(1, 'Country is required.'),
  pinCode: z.string().min(1, 'PIN code is required.'),
});

export const schoolBrandingSchema = z.object({
  displayName: z.string().min(1, 'Display name is required.'),
  logoUrl: z.string().optional().or(z.literal('')),
  primaryColor: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || HEX_COLOR_REGEX.test(val), { message: 'Enter a valid hex color (e.g. #4338CA).' }),
  secondaryColor: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || HEX_COLOR_REGEX.test(val), { message: 'Enter a valid hex color (e.g. #2563EB).' }),
});

export const attendanceSettingsSchema = z.object({
  attendanceDeadlineTime: z.string().min(1, 'Deadline time is required.'),
  attendanceEditGraceMinutes: z.string().min(1, 'Grace period is required.'),
});

export const schoolPreferencesSchema = z.object({
  timezone: z.string().min(1, 'Timezone is required.'),
  currency: z.string().min(1, 'Currency is required.'),
  dateFormat: z.string().min(1, 'Date format is required.'),
  studentIdPrefix: z.string().min(1, 'Student ID prefix is required.').regex(ID_PREFIX_REGEX, '2-6 letters only, e.g. STD.'),
  teacherIdPrefix: z.string().min(1, 'Teacher ID prefix is required.').regex(ID_PREFIX_REGEX, '2-6 letters only, e.g. TCH.'),
});

export const setupSchoolInfoSchema = z.object({
  name: z.string().min(1, 'School name is required.'),
  code: z.string().min(1, 'School code is required.'),
  principalName: z.string().optional(),
});

export const setupContactSchema = z.object({
  email: z.string().min(1, 'School email is required.').email('Enter a valid email address.'),
  phone: z.string().min(10, 'Enter a valid phone number.'),
  addressLine1: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  pinCode: z.string().optional(),
});

export const setupBrandingSchema = z.object({
  displayName: z.string().optional().or(z.literal('')),
  logoUrl: z.string().optional().or(z.literal('')),
  primaryColor: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || HEX_COLOR_REGEX.test(val), { message: 'Enter a valid hex color.' }),
  secondaryColor: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || HEX_COLOR_REGEX.test(val), { message: 'Enter a valid hex color.' }),
});

export const setupAcademicSessionSchema = z
  .object({
    sessionName: z.string().min(1, 'Academic session name is required.'),
    startDate: z.string().min(1, 'Start date is required.'),
    endDate: z.string().min(1, 'End date is required.'),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: 'End date must be after start date.',
    path: ['endDate'],
  });

export const editSchoolInfoSchema = z.object({
  name: z.string().min(1, 'School name is required.'),
  code: z.string().min(1, 'School code is required.'),
  principalName: z.string().optional(),
  email: z.string().min(1, 'Email is required.').email('Enter a valid email address.'),
  phone: z.string().min(10, 'Enter a valid phone number.'),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
});

export const createSchoolAdminSchema = z.object({
  name: z.string().min(1, 'Admin name is required.'),
  email: z.string().min(1, 'Email is required.').email('Enter a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

export const attendanceRemarkSchema = z.object({
  remark: z.string().min(1, 'Remark is required.'),
});

export function buildAssignClassSchema(classSections = {}) {
  return z
    .object({
      academicSession: z.string().min(1, 'Academic session is required.'),
      class: z.string().min(1, 'Class is required.'),
      section: z.string().optional().or(z.literal('')),
      // Which subject this teacher teaches for this class+section — lets a
      // Hindi teacher in Class 1-A assign Hindi homework there without also
      // letting a different Hindi teacher (assigned only to Class 3-A)
      // assign into Class 1-A. Optional: a Class Teacher assignment with no
      // particular subject still grants full homework access for that
      // section (see lib/homework.js's assertScopeAllowed).
      subject: z.string().optional().or(z.literal('')),
    })
    .superRefine((data, ctx) => {
      if (classHasSections(classSections, data.class) && !data.section) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Section is required.', path: ['section'] });
      }
    });
}

const studentSchemaBase = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  middleName: z.string().optional(),
  lastName: z.string().min(1, 'Last name is required.'),
  dob: z.string().min(1, 'Date of birth is required.'),
  gender: z.string().min(1, 'Gender is required.'),
  bloodGroup: z.string().optional(),
  nationality: z.string().optional(),
  aadhaarNumber: aadhaarNumberField,
  aadhaarDocument: aadhaarDocumentField,
  whatsappNumber: z.string().optional(),

  admissionNumber: z.string().min(1, 'Admission number is required.'),
  admissionDate: z.string().min(1, 'Admission date is required.'),
  academicSession: z.string().min(1, 'Academic session is required.'),
  class: z.string().min(1, 'Class is required.'),
  section: z.string().optional().or(z.literal('')),
  status: z.string().optional(),

  previousSchoolName: z.string().optional(),
  previousSchoolBoard: z.string().optional().or(z.literal('')),
  lastClassPercentage: z.string().optional(),

  guardian: guardianSchema,
  secondaryGuardian: secondaryGuardianSchema.optional(),

  primaryEmergencyName: z.string().optional(),
  primaryEmergencyRelationship: z.string().optional().or(z.literal('')),
  primaryEmergencyPhone: z.string().optional(),
  secondaryEmergencyName: z.string().optional(),
  secondaryEmergencyRelationship: z.string().optional().or(z.literal('')),
  secondaryEmergencyPhone: z.string().optional(),
  trustedRelativePhone: z.string().optional(),

  addressLine1: z.string().min(1, 'Address line 1 is required.'),
  addressLine2: z.string().optional(),
  city: z.string().min(1, 'City is required.'),
  state: z.string().min(1, 'State is required.'),
  pinCode: z.string().min(1, 'PIN code is required.'),

  admissionFeePaidDate: z.string().optional().or(z.literal('')),
  admissionFeeAmount: z.string().optional(),
  feeStructureType: z.string().optional().or(z.literal('')),
  feeStructureAmount: z.string().optional(),
  feePaymentStatus: z.string().optional().or(z.literal('')),
  outstandingDues: z.string().optional(),
});

export function buildStudentSchema(classSections = {}) {
  return studentSchemaBase.superRefine((data, ctx) => {
    if (classHasSections(classSections, data.class) && !data.section) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Section is required.', path: ['section'] });
    }
  });
}

// One row of a bulk-import spreadsheet (see lib/bulkImportColumns.js) — a
// deliberately relaxed subset of studentSchema. A teacher's export from
// whatever system they already keep records in won't have Aadhaar
// documents, secondary guardians, or fee details, so only what's needed to
// create a usable student record is required here; everything else can be
// filled in later from the student's own profile.
const bulkImportRowSchemaBase = z
  .object({
    admissionNumber: z.string().min(1, 'Admission Number is required.'),
    admissionDate: z.string().optional().or(z.literal('')),
    academicSession: z.string().optional().or(z.literal('')),
    firstName: z.string().min(1, 'First Name is required.'),
    middleName: z.string().optional().or(z.literal('')),
    lastName: z.string().min(1, 'Last Name is required.'),
    dob: z.string().min(1, 'DOB is required.'),
    gender: z.string().min(1, 'Gender is required.'),
    bloodGroup: z.string().optional().or(z.literal('')),
    nationality: z.string().optional().or(z.literal('')),
    aadhaarNumber: z.string().optional().or(z.literal('')),
    whatsappNumber: z.string().optional().or(z.literal('')),
    class: z.string().min(1, 'Class is required.'),
    section: z.string().optional().or(z.literal('')),
    fatherName: z.string().optional().or(z.literal('')),
    fatherPhone: z.string().optional().or(z.literal('')),
    fatherOccupation: z.string().optional().or(z.literal('')),
    motherName: z.string().optional().or(z.literal('')),
    motherPhone: z.string().optional().or(z.literal('')),
    motherOccupation: z.string().optional().or(z.literal('')),
    addressLine1: z.string().min(1, 'Address Line 1 is required.'),
    addressLine2: z.string().optional().or(z.literal('')),
    city: z.string().min(1, 'City is required.'),
    state: z.string().min(1, 'State is required.'),
    pinCode: z.string().min(1, 'PIN Code is required.'),
    emergencyContactName: z.string().optional().or(z.literal('')),
    emergencyContactPhone: z.string().optional().or(z.literal('')),
    emergencyContactRelationship: z.string().optional().or(z.literal('')),
  })
  .refine((row) => row.fatherName || row.motherName, {
    message: 'At least one of Father Name or Mother Name is required.',
    path: ['fatherName'],
  })
  .refine((row) => (row.fatherName ? Boolean(row.fatherPhone) : true), {
    message: 'Father Phone is required when Father Name is given.',
    path: ['fatherPhone'],
  })
  .refine((row) => (row.motherName ? Boolean(row.motherPhone) : true), {
    message: 'Mother Phone is required when Mother Name is given.',
    path: ['motherPhone'],
  });

export function buildBulkImportRowSchema(classSections = {}) {
  return bulkImportRowSchemaBase.refine((row) => !classHasSections(classSections, row.class) || Boolean(row.section), {
    message: 'Section is required for this class.',
    path: ['section'],
  });
}

export const noticeSchema = z
  .object({
    title: z.string().min(1, 'Title is required.'),
    message: z.string().min(1, 'Message is required.'),
    audience: z.enum(['Whole School', 'Class']),
    academicSession: z.string().optional().or(z.literal('')),
    className: z.string().optional().or(z.literal('')),
    sectionName: z.string().optional().or(z.literal('')),
    priority: z.enum(['Normal', 'Important', 'Urgent']),
    expiryDate: z.string().optional().or(z.literal('')),
    attachmentUrl: z.string().optional().or(z.literal('')),
    attachmentName: z.string().optional().or(z.literal('')),
    attachmentSize: z.number().optional().nullable(),
  })
  .refine((data) => data.audience !== 'Class' || data.className, {
    message: 'Select a class for a class-specific notice.',
    path: ['className'],
  });

export const calendarEventSchema = z
  .object({
    title: z.string().min(1, 'Event name is required.'),
    category: z.enum(['Exam', 'Holiday', 'PTM', 'School Event', 'Admission', 'Deadline']),
    color: z.enum(['Purple', 'Green', 'Orange', 'Blue', 'Red', 'Cyan']),
    startDate: z.string().min(1, 'Start date is required.'),
    endDate: z.string().optional().or(z.literal('')),
    appliesToType: z.enum(['Whole School', 'Specific Class', 'Specific Section']),
    // 'Specific Class': every entry is just a class name. 'Specific Section':
    // each entry is one {class, section} pair — an event can target several
    // classes, or several individual class+section combinations, at once.
    appliesToClasses: z.array(z.string()).optional(),
    appliesToSections: z.array(z.object({ class: z.string(), section: z.string() })).optional(),
    description: z.string().optional().or(z.literal('')),
    isVisible: z.boolean(),
    academicSession: z.string().optional().or(z.literal('')),
  })
  .refine((data) => !data.endDate || data.endDate >= data.startDate, {
    message: 'End date cannot be before the start date.',
    path: ['endDate'],
  })
  .refine((data) => data.appliesToType !== 'Specific Class' || (data.appliesToClasses || []).length > 0, {
    message: 'Select at least one class.',
    path: ['appliesToClasses'],
  })
  .refine((data) => data.appliesToType !== 'Specific Section' || (data.appliesToSections || []).length > 0, {
    message: 'Select at least one class + section.',
    path: ['appliesToSections'],
  });

const homeworkSchemaBase = z.object({
  academicSession: z.string().min(1, 'Academic session is required.'),
  className: z.string().min(1, 'Class is required.'),
  sectionName: z.string().optional().or(z.literal('')),
  subject: z.string().min(1, 'Subject is required.'),
  title: z.string().min(1, 'Title is required.'),
  description: z.string().optional().or(z.literal('')),
});

export function buildHomeworkSchema(classSections = {}) {
  return homeworkSchemaBase.superRefine((data, ctx) => {
    if (classHasSections(classSections, data.className) && !data.sectionName) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Section is required.', path: ['sectionName'] });
    }
  });
}

// parentExamId/retakeResultPolicy — see prisma/schema.prisma's Exam comment:
// a Re-Test/Improvement/Supplementary exam is just a normal exam that also
// names which exam it's retaking, plus how the two reconcile (Best/Latest/
// Average, applied read-time by lib/examResults.js's getEffectiveExamResult).
export const examSchema = z.object({
  name: z.string().min(1, 'Exam name is required.'),
  academicSession: z.string().min(1, 'Academic session is required.'),
  examType: z.string().min(1, 'Exam type is required.'),
  startDate: z.string().min(1, 'Start date is required.'),
  endDate: z.string().min(1, 'End date is required.'),
  classes: z.array(z.string()).min(1, 'Select at least one class.'),
  description: z.string().optional().or(z.literal('')),
  parentExamId: z.string().optional().or(z.literal('')),
  retakeResultPolicy: z.enum(['Best', 'Latest', 'Average']).default('Latest'),
}).refine((data) => data.endDate >= data.startDate, {
  message: 'End date cannot be before start date.',
  path: ['endDate'],
});

// markingType/hasPractical/isOptional/weight — see prisma/schema.prisma's
// ExamSchedule comments (theory+practical split, grade/remarks marking,
// optional/elective subjects, weighted result calculation).
export const examScheduleSchema = z.object({
  subject: z.string().min(1, 'Subject is required.'),
  className: z.string().min(1, 'Class is required.'),
  sectionName: z.string().optional().or(z.literal('')),
  examDate: z.string().min(1, 'Exam date is required.'),
  startTime: z.string().optional().or(z.literal('')),
  endTime: z.string().optional().or(z.literal('')),
  maxMarks: z.coerce.number().positive('Maximum marks must be greater than 0.'),
  passingMarks: z.coerce.number().min(0, 'Passing marks cannot be negative.'),
  examMode: z.enum(['Theory', 'Practical']).default('Theory'),
  room: z.string().optional().or(z.literal('')),
  invigilator: z.string().optional().or(z.literal('')),
  markingType: z.enum(['Numeric', 'Grade', 'Remarks']).default('Numeric'),
  hasPractical: z.boolean().optional().default(false),
  practicalMaxMarks: z.coerce.number().min(0).optional().default(0),
  practicalPassingMarks: z.coerce.number().min(0).optional().default(0),
  isOptional: z.boolean().optional().default(false),
  weight: z.coerce.number().positive('Weight must be greater than 0.').optional().default(1),
})
  .refine((data) => data.passingMarks <= data.maxMarks, {
    message: 'Passing marks cannot exceed maximum marks.',
    path: ['passingMarks'],
  })
  .refine((data) => !data.hasPractical || data.practicalMaxMarks > 0, {
    message: 'Practical maximum marks must be greater than 0.',
    path: ['practicalMaxMarks'],
  })
  .refine((data) => !data.hasPractical || data.practicalPassingMarks <= data.practicalMaxMarks, {
    message: 'Practical passing marks cannot exceed practical maximum marks.',
    path: ['practicalPassingMarks'],
  });

// Used only when *adding* a new subject to an exam's schedule (not editing
// an existing row) — `classes` (plural) replaces `className` so one form
// submission can create the same subject+date+marks entry across every
// selected class at once, instead of an admin repeating the exact same form
// once per class. See ExamScheduleFormModal.jsx's onSubmit, which loops
// addExamSchedule() once per class in `classes`.
export const examScheduleBulkSchema = z.object({
  subject: z.string().min(1, 'Subject is required.'),
  classes: z.array(z.string()).min(1, 'Select at least one class.'),
  sectionName: z.string().optional().or(z.literal('')),
  examDate: z.string().min(1, 'Exam date is required.'),
  startTime: z.string().optional().or(z.literal('')),
  endTime: z.string().optional().or(z.literal('')),
  maxMarks: z.coerce.number().positive('Maximum marks must be greater than 0.'),
  passingMarks: z.coerce.number().min(0, 'Passing marks cannot be negative.'),
  examMode: z.enum(['Theory', 'Practical']).default('Theory'),
  room: z.string().optional().or(z.literal('')),
  invigilator: z.string().optional().or(z.literal('')),
  markingType: z.enum(['Numeric', 'Grade', 'Remarks']).default('Numeric'),
  hasPractical: z.boolean().optional().default(false),
  practicalMaxMarks: z.coerce.number().min(0).optional().default(0),
  practicalPassingMarks: z.coerce.number().min(0).optional().default(0),
  isOptional: z.boolean().optional().default(false),
  weight: z.coerce.number().positive('Weight must be greater than 0.').optional().default(1),
})
  .refine((data) => data.passingMarks <= data.maxMarks, {
    message: 'Passing marks cannot exceed maximum marks.',
    path: ['passingMarks'],
  })
  .refine((data) => !data.hasPractical || data.practicalMaxMarks > 0, {
    message: 'Practical maximum marks must be greater than 0.',
    path: ['practicalMaxMarks'],
  })
  .refine((data) => !data.hasPractical || data.practicalPassingMarks <= data.practicalMaxMarks, {
    message: 'Practical passing marks cannot exceed practical maximum marks.',
    path: ['practicalPassingMarks'],
  });

// One row of a marks-entry submission (lib/examMarks.js's saveExamMarks) —
// `marksObtained` is required unless the student is absent, and is checked
// against the schedule's own maxMarks server-side (not here, since this
// schema has no access to that number without threading it through per-row).
export const examMarkRowSchema = z.object({
  studentId: z.string().min(1),
  marksObtained: z.coerce.number().min(0, 'Marks cannot be negative').nullable().optional(),
  isAbsent: z.boolean().optional().default(false),
});

// Fee items now live per-term inside a structure (see FeeStructureFormModal.jsx's
// `termsState` — Q1-Q4 sections, not a single flat list), so they're
// validated as plain JS there and again server-side (lib/fees.js's
// validateTerms), not through this resolver — a zod shape here would fight
// the 4-independent-arrays-plus-cross-term-"apply to all quarters"-copy
// behavior more than it would help.
export const feeStructureSchema = z.object({
  academicSession: z.string().min(1, 'Academic session is required.'),
  className: z.string().min(1, 'Class is required.'),
  name: z.string().optional().or(z.literal('')),
});

// Used when creating a structure for one or more classes at once (the
// multi-class checkbox picker) — class selection is validated separately
// (at least one class checked) rather than through this schema's fields,
// since it's an array picked outside react-hook-form.
export const feeStructureBaseSchema = z.object({
  academicSession: z.string().min(1, 'Academic session is required.'),
  name: z.string().optional().or(z.literal('')),
});

export const manualPaymentSchema = z.object({
  studentFeeId: z.string().min(1, 'Select a term to collect.'),
  method: z.enum(['CASH', 'UPI', 'BANK_TRANSFER'], { errorMap: () => ({ message: 'Select a payment method.' }) }),
  // Upper-bounded against the fee's own remaining due at submit time (that's
  // runtime data, not something this static schema can know) — see
  // CollectFeeModal.jsx's onSubmit.
  amount: z
    .string()
    .min(1, 'Amount is required.')
    .refine((val) => !Number.isNaN(Number(val)) && Number(val) > 0, { message: 'Enter a valid positive amount.' }),
});

// Upper bound (100% for PERCENT, the fee's own total for FIXED) is runtime
// data this static schema can't know — see DiscountModal.jsx's onSubmit.
export const discountSchema = z.object({
  discountType: z.enum(['FIXED', 'PERCENT'], { errorMap: () => ({ message: 'Select a discount type.' }) }),
  discountValue: z
    .string()
    .min(1, 'Discount value is required.')
    .refine((val) => !Number.isNaN(Number(val)) && Number(val) > 0, { message: 'Enter a valid positive value.' }),
  discountReason: z.string().optional().or(z.literal('')),
});
