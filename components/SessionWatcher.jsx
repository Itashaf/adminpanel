'use client';

import { useEffect } from 'react';

// Wraps the browser's fetch once: when one of this app's own API calls comes back
// "Not signed in" (the session ended: it expired, the account was deactivated, the
// school was suspended), the user is sent to the login page with a clear message,
// instead of every screen just showing "Failed to load".
//
// Only the app's own /api/ calls are looked at, and only the "Not signed in" answer:
// other 401s (for example a payment gateway key problem) are left alone.
export default function SessionWatcher() {
  useEffect(() => {
    if (window.__sessionWatcherInstalled) return undefined;
    window.__sessionWatcherInstalled = true;
    const originalFetch = window.fetch;
    let redirecting = false;

    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response.status === 401 && !redirecting) {
        const input = args[0];
        const url = typeof input === 'string' ? input : input?.url || '';
        const path = url.startsWith('http') ? new URL(url).pathname : url;
        if (path.startsWith('/api/') && !path.startsWith('/api/auth/')) {
          const body = await response.clone().json().catch(() => null);
          if (/not signed in/i.test(body?.error || '')) {
            redirecting = true;
            window.location.assign('/api/auth/session-ended');
          }
        }
      }
      return response;
    };

    return () => {
      window.fetch = originalFetch;
      window.__sessionWatcherInstalled = false;
    };
  }, []);

  return null;
}
