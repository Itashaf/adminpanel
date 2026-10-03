// 'Whole School' retired — replaced by these more specific targets (see
// lib/notices.js's decision log comment). 'Class' covers both "whole class,
// every section" (leave section blank) and "one section" — same as before.
export const NOTICE_AUDIENCES = ['All Staff', 'All Parents', 'Role', 'Class', 'Individual'];

// audience = 'Role' target options — Principal/Admin/Accountant only, never
// Teacher/Parent (those are their own audience kinds) or SuperAdmin
// (platform-level, not a school circular's target).
export const NOTICE_ROLE_TARGETS = ['Principal', 'Admin', 'Accountant'];

// audience = 'Individual' recipient type options.
export const NOTICE_RECIPIENT_TYPES = ['Teacher', 'Parent'];

export const NOTICE_PRIORITIES = ['Normal', 'Important', 'Urgent'];
export const MAX_NOTICE_ATTACHMENT_BYTES = 2 * 1024 * 1024;
