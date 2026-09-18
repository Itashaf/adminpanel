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

  for (const batch of chunk(messages, BATCH_SIZE)) {
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
          const staleToken = ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered';
          return staleToken ? deletePushToken(batch[index].to) : null;
        })
      );
    } catch (err) {
      console.error('sendExpoPushNotifications: batch failed', err);
    }
  }
}
