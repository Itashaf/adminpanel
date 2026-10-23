'use client';

import Pusher from 'pusher-js';

let client = null;

// One shared pusher-js instance for the whole browser tab — every component
// that needs a channel (Sidebar.jsx's badge, SupportModal.jsx's thread,
// SuperAdminNav.jsx's badge, SupportInboxExplorer.jsx's thread) calls this
// instead of each opening its own socket.
export function getPusherClient() {
  if (!client) {
    client = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, { cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER });
  }
  return client;
}
