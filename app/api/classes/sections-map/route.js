import { NextResponse } from 'next/server';
import { getClassSectionsMap } from '@/lib/classes';

// The real, per-school class→sections map (see lib/classes.js's
// getClassSectionsMap) — every client component that used to read the old
// static lib/students.js CLASS_SECTIONS now fetches this instead, via
// lib/hooks/useClassSections.js.
export async function GET() {
  const map = await getClassSectionsMap();
  return NextResponse.json(map);
}
