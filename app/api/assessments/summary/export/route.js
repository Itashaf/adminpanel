import * as XLSX from 'xlsx';
import { NextResponse } from 'next/server';
import { getCurrentUserInfo } from '@/lib/iam';
import { getClassAssessmentSummary } from '@/lib/studentAssessments';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// GET /api/assessments/summary/export?class=&section=&session=&month=&year=
// — the same perStudent rows the Reports page's table shows, as a
// downloadable .xlsx (real Excel, not a CSV) — same `xlsx` package the
// student bulk-import template route already uses, no new dependency.
export async function GET(request) {
  const currentUser = await getCurrentUserInfo();
  if (!currentUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const className = searchParams.get('class');
  const sectionName = searchParams.get('section');
  const academicSession = searchParams.get('session');
  const month = Number(searchParams.get('month'));
  const year = Number(searchParams.get('year'));

  if (!className || !sectionName || !academicSession || !month || !year) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  let summary;
  try {
    summary = await getClassAssessmentSummary(currentUser, { className, sectionName, academicSession, month, year });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }

  const headers = ['#', 'Student Name', 'Admission No', 'Status', 'Overall Performance', 'Parent Contacted'];
  const rows = summary.perStudent.map((s, i) => [i + 1, s.name, s.admissionId, s.status, s.overallPerformance, s.parentContacted]);
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  sheet['!cols'] = [{ wch: 4 }, { wch: 24 }, { wch: 16 }, { wch: 12 }, { wch: 18 }, { wch: 14 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Assessment Summary');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  const fileName = `${className}-${sectionName}-${MONTH_NAMES[month - 1]}-${year}-assessments.xlsx`.replace(/\s+/g, '-');
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  });
}
