import { NextResponse } from 'next/server';
import { generateDueStudentFees } from '@/lib/fees';
import { runWithSchool } from '@/lib/auth/schoolContext';
import prisma from '@/lib/db';

// Vercel Cron (see vercel.json's "crons" entry, daily) — auto-generates any
// fee-structure term whose quarter start date has arrived, so an admin no
// longer has to remember to click "Generate Fees" once each quarter begins.
// Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` on
// scheduled invocations when that env var is set — verified here so this
// endpoint can't be triggered by an arbitrary outside request to
// mass-generate fees on demand.
export async function GET(request) {
  // Fails closed: with no CRON_SECRET configured nobody can call this.
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Every active school, each resolved on its own (no shared global state).
    // One school failing must not stop the others.
    const schools = await prisma.school.findMany({ where: { status: 'Active' }, select: { id: true } });
    const results = [];
    const failedSchools = [];
    for (const school of schools) {
      try {
        const schoolResults = await runWithSchool(school.id, () => generateDueStudentFees());
        for (const r of schoolResults) results.push({ schoolId: school.id, ...r });
      } catch (err) {
        console.error(`generate-fees cron failed for school ${school.id}`, err);
        failedSchools.push(school.id);
      }
    }
    return NextResponse.json({
      success: failedSchools.length === 0,
      schoolsProcessed: schools.length - failedSchools.length,
      failedSchools,
      termsProcessed: results.length,
      results,
    });
  } catch (err) {
    console.error('generate-fees cron failed', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
