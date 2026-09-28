import { generateMonthlyImportTemplate } from '@/lib/performance/bulkImport';
import { requirePermission } from '@/lib/rbac';

export async function GET(request) {
  const { error } = await requirePermission('performanceReports.monthly.manage');
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const className = searchParams.get('class') || '';
  const sectionName = searchParams.get('section') || '';
  const academicSession = searchParams.get('academicSession') || '';
  if (!className || !sectionName || !academicSession) {
    return new Response(JSON.stringify({ error: 'class, section and academicSession are required.' }), { status: 400 });
  }

  const buffer = await generateMonthlyImportTemplate({ className, sectionName, academicSession });
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="monthly-report-import-${className}-${sectionName}.xlsx"`,
    },
  });
}
