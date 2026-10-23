import { after } from 'next/server';

// Notifications (push, in-app, admin bell) are sent AFTER the response goes back to
// the user, so the page is not held up by them. They used to be started and then
// forgotten; on Vercel the server function can be frozen the moment the response is
// sent, which silently cut sends short. `after()` keeps the function alive until the
// work has finished.
//
// Pass the promise the work already returned, e.g.
//   runAfterResponse(notifyPaymentConfirmed(...), 'notifyPaymentConfirmed');
// A failure is logged under `label`, never thrown into the request. Outside a request (a script),
// where `after()` is not available, it just waits for the promise as before.
export function runAfterResponse(work, label) {
  const finish = async () => {
    try {
      await work;
    } catch (err) {
      console.error(label, err);
    }
  };
  try {
    after(finish);
  } catch {
    finish();
  }
}
