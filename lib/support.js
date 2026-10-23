import prisma from './db';
import { triggerSupportEvent } from './pusher';
import { createAdminNotification } from './adminNotifications';
import { runAfterResponse } from './background';

const CATEGORIES = ['TECHNICAL', 'BILLING', 'FEATURE_REQUEST', 'OTHER'];
const PRIORITIES = ['LOW', 'NORMAL', 'HIGH'];
const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const STATUS_LABELS = { OPEN: 'Open', IN_PROGRESS: 'In Progress', RESOLVED: 'Resolved', CLOSED: 'Closed' };

// "#TK-1024" instead of a bare sequence number — same cosmetic offset either
// way, never stored, purely a display format over the real `ticketNumber`.
export function formatTicketNumber(ticketNumber) {
  return `#TK-${1000 + ticketNumber}`;
}

// Never includes lastSeenBySchoolAt/lastSeenBySuperAdminAt — a school has no
// business knowing exactly when SuperAdmin last looked, or vice versa, so
// those two stay on the raw Prisma row and never reach decorateTicket's
// output at all (see isUnread below, which reads them straight off `row`
// before this runs).
function decorateTicket(row) {
  return {
    id: row.id,
    ticketNumber: formatTicketNumber(row.ticketNumber),
    schoolId: row.schoolId,
    schoolName: row.school?.displayName,
    raisedByName: row.raisedByName,
    raisedByRoleKey: row.raisedByRoleKey,
    subject: row.subject,
    category: row.category,
    priority: row.priority,
    message: row.message,
    attachmentUrl: row.attachmentUrl || null,
    status: row.status,
    replyCount: row._count?.replies ?? row.replies?.length ?? 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// A ticket is unread for a side when that side has never looked at it, or
// looked at it before the last real change (`updatedAt`) — see
// markTicketSeen's own comment for why viewing never bumps `updatedAt`
// itself. Takes the RAW row (Date objects, not yet decorated/serialized).
function isUnread(row, seenField) {
  const seenAt = row[seenField];
  return !seenAt || row.updatedAt > seenAt;
}

function decorateReply(row) {
  return {
    id: row.id,
    authorName: row.authorName,
    isSuperAdmin: row.isSuperAdmin,
    message: row.message,
    attachmentUrl: row.attachmentUrl || null,
    createdAt: row.createdAt.toISOString(),
  };
}

// A school's own tickets — newest first, reply count only (no thread body;
// the list view doesn't need it, see getTicketWithReplies for the thread).
export async function getSchoolTickets(schoolId) {
  const rows = await prisma.supportTicket.findMany({
    where: { schoolId },
    include: { _count: { select: { replies: true } } },
    orderBy: { updatedAt: 'desc' },
    // The 100 most recently active; older tickets are also cleared out by the 90-day cleanup.
    take: 100,
  });
  return rows.map((row) => ({ ...decorateTicket(row), unread: isUnread(row, 'lastSeenBySchoolAt') }));
}

// Every ticket, across every school — the SuperAdmin inbox. `status` is an
// optional filter ('' = all).
export async function getAllTickets({ status = '' } = {}) {
  const rows = await prisma.supportTicket.findMany({
    where: status ? { status } : {},
    include: { school: { select: { displayName: true } }, _count: { select: { replies: true } } },
    orderBy: { updatedAt: 'desc' },
    take: 200,
  });
  return rows.map((row) => ({ ...decorateTicket(row), unread: isUnread(row, 'lastSeenBySuperAdminAt') }));
}

// Sidebar/SuperAdminNav badge counts — how many tickets are unread for that
// side right now, independent of which ticket (if any) is currently open.
export async function getSchoolUnreadSupportCount(schoolId) {
  const rows = await prisma.supportTicket.findMany({
    where: { schoolId },
    select: { updatedAt: true, lastSeenBySchoolAt: true },
  });
  return rows.filter((t) => !t.lastSeenBySchoolAt || t.updatedAt > t.lastSeenBySchoolAt).length;
}

export async function getSuperAdminUnreadSupportCount() {
  const rows = await prisma.supportTicket.findMany({ select: { updatedAt: true, lastSeenBySuperAdminAt: true } });
  return rows.filter((t) => !t.lastSeenBySuperAdminAt || t.updatedAt > t.lastSeenBySuperAdminAt).length;
}

// Marks a ticket seen by one side — raw SQL specifically so this never
// bumps `updatedAt` (a plain prisma.update() always touches @updatedAt
// fields, which would make merely VIEWING a ticket look like a new change
// to the OTHER side, a false unread). `side` is never user input — always
// a literal 'school'/'superadmin' from this file's own route callers.
export async function markTicketSeen(ticketId, side) {
  const column = side === 'superadmin' ? 'lastSeenBySuperAdminAt' : 'lastSeenBySchoolAt';
  await prisma.$executeRawUnsafe(`UPDATE "SupportTickets" SET "${column}" = NOW() WHERE id = $1`, ticketId);
}

// `schoolId` scopes a staff caller to their own school's ticket; omitted
// (SuperAdmin) returns any ticket regardless of school.
export async function getTicketWithReplies(id, schoolId = null) {
  const row = await prisma.supportTicket.findFirst({
    where: { id, ...(schoolId ? { schoolId } : {}) },
    include: { school: { select: { displayName: true } }, replies: { orderBy: { createdAt: 'asc' } } },
  });
  if (!row) return null;
  return { ...decorateTicket(row), replies: row.replies.map(decorateReply) };
}

export async function createTicket(schoolId, actor, { subject, category, priority, message, attachmentUrl }) {
  if (!subject?.trim()) throw new Error('Subject is required.');
  if (!message?.trim()) throw new Error('Message is required.');
  if (category && !CATEGORIES.includes(category)) throw new Error('Invalid category.');
  if (priority && !PRIORITIES.includes(priority)) throw new Error('Invalid priority.');

  const row = await prisma.supportTicket.create({
    data: {
      schoolId,
      raisedByUserId: actor.id || null,
      raisedByName: actor.name,
      raisedByRoleKey: actor.roleKey || actor.role,
      subject: subject.trim(),
      category: category || 'OTHER',
      priority: priority || 'NORMAL',
      message: message.trim(),
      attachmentUrl: attachmentUrl || null,
      // The raiser has obviously seen their own new ticket — SuperAdmin
      // hasn't (stays null, so it shows unread for them right away).
      lastSeenBySchoolAt: new Date(),
    },
    include: { school: { select: { displayName: true } } },
  });
  const ticket = decorateTicket(row);
  // The SuperAdmin inbox needs to know right away — the school obviously
  // already knows (they just submitted it), so no event on their own
  // channel here.
  triggerSupportEvent('support-superadmin', 'ticket-updated', { ticketId: ticket.id });
  return ticket;
}

// `schoolId` scopes a staff reply to their own ticket — a school can never
// reply onto another school's ticket id; `null` (SuperAdmin) has no such
// restriction. Replying also bumps the ticket back to OPEN if a SuperAdmin
// had marked it RESOLVED/CLOSED and the school is following up, same
// "re-opens on new activity" convention as a support inbox would expect.
export async function addReply(ticketId, actor, message, { schoolId = null, isSuperAdmin = false, attachmentUrl = null } = {}) {
  if (!message?.trim() && !attachmentUrl) throw new Error('Message is required.');

  const ticket = await prisma.supportTicket.findFirst({ where: { id: ticketId, ...(schoolId ? { schoolId } : {}) } });
  if (!ticket) throw new Error('Ticket not found.');

  const [reply] = await prisma.$transaction([
    prisma.supportTicketReply.create({
      data: { ticketId, authorName: actor.name, isSuperAdmin, message: message?.trim() || '', attachmentUrl },
    }),
    prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        ...(!isSuperAdmin && ['RESOLVED', 'CLOSED'].includes(ticket.status) ? { status: 'OPEN' } : {}),
        // The side that just replied has, by definition, seen the ticket
        // as of right now — the OTHER side's lastSeen is deliberately left
        // untouched, so this new reply shows as unread for them.
        ...(isSuperAdmin ? { lastSeenBySuperAdminAt: new Date() } : { lastSeenBySchoolAt: new Date() }),
      },
    }),
  ]);

  // The reply's own thread (if anyone has it open), plus both sides' list/
  // badge channels — whichever side didn't just write this reply is the
  // one who actually needs the push.
  triggerSupportEvent(`support-ticket-${ticketId}`, 'new-reply', { ticketId });
  triggerSupportEvent(`support-school-${ticket.schoolId}`, 'ticket-updated', { ticketId });
  triggerSupportEvent('support-superadmin', 'ticket-updated', { ticketId });

  // A real Notification Bell entry for the school — only when SuperAdmin is
  // the one replying (a school replying to its own ticket is their own
  // action, nothing to notify them about, same "only the other side's
  // activity is news" convention as every other createAdminNotification
  // call site in this app).
  if (isSuperAdmin) {
    runAfterResponse(createAdminNotification(ticket.schoolId, {
      type: 'support',
      title: 'New reply on your support ticket',
      message: `Support replied to "${ticket.subject}": ${(message || '').slice(0, 120)}`,
      link: `/dashboard?supportTicket=${ticketId}`,
      sourceId: ticketId,
    }), 'createAdminNotification failed');
  }

  return decorateReply(reply);
}

export async function updateTicketStatus(ticketId, status) {
  if (!STATUSES.includes(status)) throw new Error('Invalid status.');
  const row = await prisma.supportTicket.update({
    where: { id: ticketId },
    // Always a SuperAdmin-only action (see the route's requireSuperAdmin
    // guard) — they've obviously just seen it.
    data: { status, lastSeenBySuperAdminAt: new Date() },
    include: { school: { select: { displayName: true } } },
  });
  const ticket = decorateTicket(row);
  triggerSupportEvent(`support-ticket-${ticketId}`, 'status-changed', { ticketId, status });
  triggerSupportEvent(`support-school-${ticket.schoolId}`, 'ticket-updated', { ticketId });

  runAfterResponse(createAdminNotification(ticket.schoolId, {
    type: 'support',
    title: 'Support ticket status updated',
    message: `"${ticket.subject}" is now ${STATUS_LABELS[status] || status}.`,
    link: `/dashboard?supportTicket=${ticketId}`,
    sourceId: ticketId,
  }), 'createAdminNotification failed');

  return ticket;
}

// Called daily by Vercel Cron (app/api/cron/cleanup-support-tickets) —
// purges any ticket that's had no activity in 3 months (its own message, a
// reply, a status change — anything bumping `updatedAt`), attachments
// first (R2 objects, via lib/storage.js) then the ticket row itself
// (SupportTicketReply rows cascade, see the schema's onDelete: Cascade).
// Scoped to `updatedAt`, not `createdAt` — a ticket still being actively
// discussed must never be purged just because it was first raised a while
// ago.
export async function cleanupOldTickets({ olderThanDays = 90 } = {}) {
  const { deleteObject, keyFromPublicUrl } = await import('./storage');
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

  const tickets = await prisma.supportTicket.findMany({
    where: { updatedAt: { lt: cutoff } },
    include: { replies: { select: { attachmentUrl: true } } },
  });
  if (tickets.length === 0) return { deletedCount: 0, attachmentsDeleted: 0 };

  const attachmentUrls = tickets.flatMap((t) => [t.attachmentUrl, ...t.replies.map((r) => r.attachmentUrl)]).filter(Boolean);

  // Best-effort — an R2 hiccup on one orphaned object must never block the
  // rest of the cleanup (deleteObject itself already swallows its own
  // errors, same convention as every other R2 cleanup in this app).
  await Promise.all(attachmentUrls.map((url) => deleteObject(keyFromPublicUrl(url))));

  await prisma.supportTicket.deleteMany({ where: { id: { in: tickets.map((t) => t.id) } } });

  return { deletedCount: tickets.length, attachmentsDeleted: attachmentUrls.length };
}
