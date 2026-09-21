import { deletePushToken } from './pushTokens';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100; // Expo's per-request limit

function chunk(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

// Fire-and-forget wrapper around Expo's Push API — the caller (lib/notices.js's
// createNotice) treats sending as best-effort, so nothing here ever throws;
// a failed batch is logged and swallowed rather than surfacing as a 400 on
// notice creation.
export async function sendExpoPushNotifications(messages) {
  if (!messages?.length) return;

  // Batches are independent (Expo has no ordering/rate contract between
  // them), so a whole-school notice's dozens of 100-token batches now fire
  // together instead of one at a time — this was a sequential for-loop that
  // made a 5,000-recipient notice pay 50 round-trips back to back, on a
  // fire-and-forget path nothing ever awaits the result of anyway.
  await Promise.all(
    chunk(messages, BATCH_SIZE).map(async (batch) => {
      try {
        const res = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
          },
          body: JSON.stringify(batch),
        });
        const json = await res.json();
        const tickets = json?.data || [];

        await Promise.all(
          tickets.map((ticket, index) => {
            if (ticket.status !== 'error') return null;
            if (ticket.details?.error === 'DeviceNotRegistered') {
              return deletePushToken(batch[index].to);
            }
            // Every other error (InvalidCredentials, MessageTooBig,
            // MismatchSenderId, ...) used to be silently discarded here —
            // Expo's relay still answers 200 for these, so nothing ever
            // surfaced a real delivery failure (e.g. missing/invalid FCM
            // credentials for this Expo project) anywhere, including server
            // logs. Log it so a "push never arrives" report is diagnosable.
            console.error('sendExpoPushNotifications: ticket error', ticket.details?.error || ticket.message, {
              to: batch[index].to,
            });
            return null;
          })
        );
      } catch (err) {
        console.error('sendExpoPushNotifications: batch failed', err);
      }
    })
  );
}
