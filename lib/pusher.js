// Server-only Pusher client — triggers real-time events for Support chat
// (lib/support.js). Never imported from a Client Component (the secret key
// would leak); the browser side uses pusher-js directly with
// NEXT_PUBLIC_PUSHER_KEY/CLUSTER instead (see components/support/
// SupportModal.jsx / components/superadmin/SupportInboxExplorer.jsx).
import Pusher from 'pusher';

let client = null;

function getClient() {
  if (!client) {
    client = new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.PUSHER_CLUSTER,
      useTLS: true,
    });
  }
  return client;
}

// Channel naming:
// - `support-school-{schoolId}` — that school's own ticket list/badge.
// - `support-superadmin` — the global SuperAdmin inbox/badge.
// - `support-ticket-{ticketId}` — one open thread's live messages/status.
// Best-effort, same convention as every other fire-and-forget notification
// in this app (lib/adminNotifications.js, lib/expoPush.js) — a Pusher
// hiccup must never fail the actual ticket/reply/status write that already
// succeeded.
export async function triggerSupportEvent(channel, event, data) {
  try {
    await getClient().trigger(channel, event, data);
  } catch (err) {
    console.error('Pusher trigger failed', err);
  }
}
