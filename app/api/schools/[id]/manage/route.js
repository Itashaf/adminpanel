import { NextResponse } from 'next/server';
import { getSchoolDirectoryEntry } from '@/lib/schools';
import { setActiveSchoolContext } from '@/lib/school';
import { setCurrentRole } from '@/lib/currentUser';

export async function POST(request, { params }) {
  const { id } = await params;

  const entry = await getSchoolDirectoryEntry(id);
  if (!entry) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 });
  }

  // setActiveSchoolContext() only updates the in-memory singleton's id and
  // returns nothing — `entry` (already fetched above) is the real decorated
  // school data to hand back to the client.
  await setActiveSchoolContext(entry);
  // A super admin stepping into a school always lands with full access —
  // the Teacher demo role is only ever entered via /login's RoleToggle.
  await setCurrentRole('SchoolAdmin');
  return NextResponse.json(entry);
}
