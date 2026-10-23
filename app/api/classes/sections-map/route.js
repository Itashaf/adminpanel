import { NextResponse } from 'next/server';
import { getClassSectionsMap, getClassSectionsMapForSession } from '@/lib/classes';
import { getCurrentUserInfo } from '@/lib/iam';

// The real, per-school class→sections map (see lib/classes.js's
// getClassSectionsMap) — every client component that used to read the old
// static lib/students.js CLASS_SECTIONS now fetches this instead, via
// lib/hooks/useClassSections.js. Both SchoolAdmin and Teacher forms use that
// hook (fee/homework/notice forms, etc.), so any real signed-in session is
// enough — not admin-only.
export async function GET(request) {
  const currentUser = await getCurrentUserInfo();
  if (!currentUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const session = new URL(request.url).searchParams.get('session');
  const map = session ? await getClassSectionsMapForSession(session) : await getClassSectionsMap();
  return NextResponse.json(map);
}
