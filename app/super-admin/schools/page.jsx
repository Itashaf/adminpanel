import SchoolsDirectory from '@/components/superadmin/SchoolsDirectory';
import { getAllSchools } from '@/lib/schools';

export const metadata = {
  title: 'Schools | SchoolApp 360 Super Admin',
};

// This page has no cookies()/headers() call of its own, so Next.js would
// otherwise treat it as static and run it (hitting the DB) at build time —
// fine locally, but a production build has no DB reachable yet at that
// point (see the Vercel build log: "Environment variable not found:
// DATABASE_URL" prerendering this exact page). Forcing dynamic defers
// every DB read to request time, like every other authenticated page here.
export const dynamic = 'force-dynamic';

export default async function SchoolsPage() {
  const schools = await getAllSchools();
  return <SchoolsDirectory schools={schools} />;
}
