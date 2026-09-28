import { notFound } from 'next/navigation';
import { getSchoolSettings } from './schoolSettings';
import { isFeatureEnabled } from './featureFlags';

// Server Component guard for a gated module's route group — 404s (not a
// redirect) so a disabled module looks the same as one that was never
// built, rather than revealing it exists but is switched off. Split from
// lib/featureFlags.js because getSchoolSettings() transitively pulls in
// next/headers, which breaks the client bundle the moment a Client
// Component imports it — only import this from a Server Component/layout.
//
// This only covers page navigation. The underlying API routes for a
// disabled module are NOT blocked by this — a direct call still works.
// Deliberately scoped that way for now: full per-route enforcement would
// touch ~20 more files for a feature whose only real user is the platform
// operator deciding what to roll out, not an adversarial school admin
// trying to bypass their own plan.
export async function requireFeatureEnabled(key) {
  const school = await getSchoolSettings();
  if (!isFeatureEnabled(school.disabledFeatures, key)) notFound();
}

// API-route version — no notFound() (that only works in a Server
// Component/Page), just a boolean the route checks and turns into a 403.
export async function isModuleEnabled(key) {
  const school = await getSchoolSettings();
  return isFeatureEnabled(school.disabledFeatures, key);
}
