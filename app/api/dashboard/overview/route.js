import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { getDashboardOverview } from '@/lib/dashboard';

// GET /api/dashboard/overview — the same getDashboardOverview() payload
// app/dashboard/page.jsx renders server-side for admin-tier roles, exposed
// for the mobile app. Teacher/Parent have their own dashboards and never
// get the school-wide numbers. Fee figures are stripped unless the caller
// holds fees.view, mirroring the web page's can('fees.view') card gating.
export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (user.roleKey === 'Teacher' || user.roleKey === 'Parent') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const overview = await getDashboardOverview();
  if (!user.permissions.has('fees.view')) {
    overview.feesStats = null;
    overview.snapshot = { ...overview.snapshot, feeCollectedToday: null };
    overview.schoolPulse = { ...overview.schoolPulse, pendingFees: null };
  }
  return NextResponse.json(overview);
}
