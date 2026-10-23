'use client';

import Pusher from 'pusher-js';

let client = null;

// One shared pusher-js instance for the whole browser tab — every component
// that needs a channel (Sidebar.jsx's badge, SupportModal.jsx's thread,
// SuperAdminNav.jsx's badge, SupportInboxExplorer.jsx's thread) calls this
// instead of each opening its own socket.
// Used when the Pusher key is not configured (NEXT_PUBLIC_PUSHER_KEY unset in this build): the
// support chat just does not update live, instead of pusher-js throwing and the whole page failing.
const noopChannel = { bind() {}, unbind() {} };
const noopClient = { subscribe: () => noopChannel, unsubscribe() {} };

export function getPusherClient() {
  if (!process.env.NEXT_PUBLIC_PUSHER_KEY) return noopClient;
  if (!client) {
    client = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, { cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER });
  }
  return client;
}
