import { getAllStudents } from './students';
import { getAllTeachers } from './teachers';
import { getClassesForSession } from './classes';
import { getActiveSession } from './academicSessions';
import { getAttendanceRecord, getAttendanceSummary, getAttendanceTrend, toLocalDateStr } from './attendance';
import { getVisibleNotices } from './notices';
import { getVisibleHomework } from './homework';
import { getFeesStats, getFeesCollectedToday, getFeesCollectedThisMonth, getOverdueStudentCount } from './fees';
import { getPendingMarksAlerts } from './examMarks';
import { resolveSchoolId } from './auth/schoolContext';
import prisma from './db';

// A Teacher's dashboard shows only what's theirs — their own assigned
// classes' student counts, whether today's attendance is marked for each,
// how much of their own homework is still active, and a peek at the notices
// they can see and the homework they've set — never the school-wide numbers
// on the admin dashboard above.
export async function getTeacherDashboardOverview(currentUser) {
  const assignedClasses = currentUser.assignedClasses || [];
  const today = toLocalDateStr(new Date());

  const schoolId = await resolveSchoolId();
  const [allStudents, notices, homework] = await Promise.all([
    getAllStudents(schoolId),
    getVisibleNotices(currentUser),
    getVisibleHomework(currentUser),
  ]);

  const classRows = await Promise.all(
    assignedClasses.map(async (assignment) => {
      const studentCount = allStudents.filter(
        (s) =>
          s.academicSession === assignment.academicSession &&
          s.class === assignment.class &&
          s.section === assignment.section &&
          s.status === 'Active'
      ).length;
      const record = await getAttendanceRecord(assignment.academicSession, today, assignment.class, assignment.section);
      return { ...assignment, studentCount, attendanceMarked: Boolean(record) };
    })
  );

  const totalStudents = classRows.reduce((sum, c) => sum + c.studentCount, 0);
  const attendanceMarkedCount = classRows.filter((c) => c.attendanceMarked).length;

  const myHomework = homework.filter((hw) => hw.assignedByTeacherId === currentUser.teacherId);

  return {
    classRows,
    stats: {
      totalClasses: classRows.length,
      totalStudents,
      attendanceMarkedCount,
      attendanceTotal: classRows.length,
      activeHomeworkCount: myHomework.length,
    },
    recentNotices: notices.slice(0, 3),
    // getVisibleHomework already comes back newest-first (see
    // lib/homework.js's getAllHomework), so this is just the latest 3.
    upcomingHomework: myHomework.slice(0, 3),
  };
}

// Was hardcoded demo numbers (1,248 students, 68 teachers, etc.) regardless
// of which school was actually active — every school looked identical on
// its own dashboard. Now a real aggregate over this school's own data (see
// lib/schoolScope.js), so a brand new school correctly starts at all zeros
// instead of showing ABC Public School's numbers.
export async function getDashboardOverview() {
  const schoolId = await resolveSchoolId();
  const [
    allStudents,
    allTeachers,
    activeSession,
    feesStats,
    feesCollectedToday,
    feesCollectedThisMonth,
    overdueStudentCount,
    pendingMarksAlerts,
    recentActivity,
  ] = await Promise.all([
    getAllStudents(schoolId),
    getAllTeachers(schoolId),
    getActiveSession(),
    getFeesStats(),
    getFeesCollectedToday(),
    getFeesCollectedThisMonth(),
    getOverdueStudentCount(),
    getPendingMarksAlerts(),
    getRecentActivity(),
  ]);

  const activeStudents = allStudents.filter((s) => s.status === 'Active');
  const inactiveStudents = allStudents.length - activeStudents.length;
  const thisMonth = new Date().toISOString().slice(0, 7);
  const newThisMonth = allStudents.filter((s) => s.admissionDate?.startsWith(thisMonth)).length;
  // Real month-over-month deltas for the KPI cards' trend indicators (see
  // StatCard.jsx) — "how many of the current total joined/were created this
  // calendar month", not a fabricated percentage. `null` (never a bare 0)
  // when the base count is 0, so a brand-new school with nothing yet shows
  // no trend badge instead of a misleading "0%".
  const teachersJoinedThisMonth = allTeachers.filter((t) => t.joiningDate?.startsWith(thisMonth)).length;

  const today = toLocalDateStr(new Date());
  const attendanceToday = activeSession
    ? await getAttendanceSummary({ academicSession: activeSession.name, from: today, to: today })
    : null;

  // Last 14 real calendar days (2 school weeks) of attendance, used to build
  // the mini trend chart, this week's average, and "vs last week" — all
  // derived from actual daily records, not a fabricated series. A day
  // nobody has marked yet (weekend, holiday) has `total === 0` and is
  // excluded from the averages so it doesn't drag a real number down.
  const dateOffset = (days) => toLocalDateStr(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
  const last14Days = activeSession
    ? await getAttendanceTrend({ academicSession: activeSession.name, from: dateOffset(13), to: today })
    : [];
  const thisWeekDays = last14Days.slice(7).filter((d) => d.total > 0);
  const lastWeekDays = last14Days.slice(0, 7).filter((d) => d.total > 0);
  const avg = (days) => (days.length ? Math.round((days.reduce((s, d) => s + d.percent, 0) / days.length) * 10) / 10 : null);
  const weeklyAverage = avg(thisWeekDays);
  const lastWeekAverage = avg(lastWeekDays);
  const trendVsLastWeek =
    weeklyAverage != null && lastWeekAverage != null ? Math.round((weeklyAverage - lastWeekAverage) * 10) / 10 : null;

  const classes = activeSession ? await getClassesForSession(activeSession.name) : [];
  const activeClasses = classes.filter((c) => c.status === 'Active');
  // Section.capacity defaults to 0 until an admin actually sets one (see
  // Classes & Sections → section settings) — a 0 means "not configured yet",
  // not "zero seats". Folding those sections' students into the numerator
  // while their capacity contributes nothing to the denominator is what
  // produced nonsense readings like "250% Capacity" (e.g. 100 students
  // total against only one 40-seat section that happened to have a
  // capacity set). Only sections an admin has actually sized are counted,
  // on both sides of the ratio.
  const sizedSections = activeClasses.flatMap((c) => c.sections).filter((s) => s.capacity > 0);
  const totalCapacity = sizedSections.reduce((sum, s) => sum + s.capacity, 0);
  const totalStudentsInClasses = sizedSections.reduce((sum, s) => sum + s.studentCount, 0);
  const capacityPercent = totalCapacity > 0 ? Math.round((totalStudentsInClasses / totalCapacity) * 100) : 0;
  const classesCreatedThisMonth = activeClasses.filter((c) => c.createdAt?.startsWith(thisMonth)).length;

  // Percentage change vs the count *before* this month's additions — e.g. 5
  // new students against 45 already-existing ones is "+11% this month".
  // `null` (never 0%) when there's no prior base to compare against, so
  // StatCard omits the badge instead of showing a misleading 0%/∞%.
  const pctChange = (newCount, priorBase) => (priorBase > 0 ? Math.round((newCount / priorBase) * 1000) / 10 : null);
  const studentsTrend = pctChange(newThisMonth, activeStudents.length - newThisMonth);
  const teachersTrend = pctChange(teachersJoinedThisMonth, allTeachers.length - teachersJoinedThisMonth);
  const classesTrend = pctChange(classesCreatedThisMonth, activeClasses.length - classesCreatedThisMonth);

  // Real per-class headcounts for the Student Overview widget's bar list
  // (see StudentOverviewCard.jsx) — reuses the same totalStudents each
  // class already carries (see lib/classes.js's decorateClass), just
  // reshaped and percentaged against the school-wide active-class total.
  const DISTRIBUTION_CLASSES = ['Nursery', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5'];
  const schoolwideClassTotal = activeClasses.reduce((sum, c) => sum + c.totalStudents, 0);
  const classDistribution = DISTRIBUTION_CLASSES.map((name) => {
    const match = activeClasses.find((c) => c.name === name);
    const count = match?.totalStudents || 0;
    return {
      name,
      count,
      percent: schoolwideClassTotal > 0 ? Math.round((count / schoolwideClassTotal) * 1000) / 10 : 0,
    };
  });

  const recentStudents = [...allStudents]
    .sort((a, b) => new Date(b.admissionDate) - new Date(a.admissionDate))
    .slice(0, 5)
    .map((s) => ({
      admissionId: s.admissionId,
      name: `${s.firstName} ${s.lastName}`,
      initials: s.initials,
      classSection: `${s.class} - ${s.section}`,
      parentContact: s.guardian?.phone || '—',
      status: s.status,
    }));

  // Only rules with a real backing data source are included — "Leave
  // requests pending approval" and "Transport complaint unresolved" have no
  // Leave/Complaint model in the schema yet, so they're deliberately left
  // out rather than faked; add their own rule here once that data exists.
  const smartAlerts = [
    ...(overdueStudentCount > 0
      ? [
          {
            id: 'overdue-fees',
            severity: 'red',
            message: `${overdueStudentCount} student${overdueStudentCount === 1 ? '' : 's'} have overdue fees`,
            href: '/dashboard/fees/students?status=DUE',
          },
        ]
      : []),
    ...pendingMarksAlerts.map((a) => ({
      id: `marks-${a.className}`,
      severity: 'amber',
      message: `Exam marks pending for ${a.className}${a.pendingSubjects > 1 ? ` (${a.pendingSubjects} subjects)` : ''}`,
      href: '/dashboard/exams/list',
    })),
  ];

  // School Pulse card's Health Score (see SchoolPulseCard.jsx) — a
  // transparent weighted blend of three real signals, never an invented
  // number: 40% today's attendance rate, 40% fee recovery rate, 20% an
  // inverted pending-tasks penalty (each open task costs 10 points, floored
  // at 0) — rounded to a whole number out of 100.
  const taskScore = Math.max(0, 100 - smartAlerts.length * 10);
  const healthScore = Math.round((attendanceToday?.percent ?? 0) * 0.4 + feesStats.recoveryPercent * 0.4 + taskScore * 0.2);
  const healthStatus = healthScore >= 85 ? 'Excellent' : healthScore >= 70 ? 'Good' : healthScore >= 50 ? 'Fair' : 'Needs Attention';

  return {
    stats: {
      totalStudents: { value: allStudents.length, trendPercent: studentsTrend, newThisMonth },
      totalTeachers: { value: allTeachers.length, trendPercent: teachersTrend, newThisMonth: teachersJoinedThisMonth },
      activeClasses: {
        value: activeClasses.length,
        capacityPercent,
        trendPercent: classesTrend,
        newThisMonth: classesCreatedThisMonth,
        sectionCount: activeClasses.reduce((sum, c) => sum + c.sectionCount, 0),
      },
      academicSession: {
        label: activeSession?.name || 'No active session',
        statusLabel: activeSession ? 'Active session' : 'Set up an academic session to get started',
      },
    },
    feesStats: { ...feesStats, collectedThisMonth: feesCollectedThisMonth },
    attendanceToday,
    // Attendance Overview widget's weekly figures (see
    // AttendanceOverviewCard.jsx) — `chartDays` is the real last-7-days
    // series for the mini chart, `null` averages mean no marked days exist
    // yet in that window rather than a fabricated 0.
    attendanceWeekly: { weeklyAverage, lastWeekAverage, trendVsLastWeek, chartDays: last14Days.slice(7) },
    classDistribution,
    // Smart Alerts widget (see SmartAlertsCard.jsx) — only rules with a real
    // backing data source are included. "Leave requests pending approval"
    // and "Transport complaint unresolved" have no Leave/Complaint model in
    // the schema yet, so they're deliberately left out rather than faked;
    // add their own rule here once that data actually exists.
    smartAlerts,
    // School Pulse card (see SchoolPulseCard.jsx) — the dashboard's top
    // executive-summary strip. `pendingTasks` is the same real count as
    // smartAlerts above, so the two never disagree.
    schoolPulse: {
      attendanceToday: attendanceToday?.percent ?? null,
      pendingFees: feesStats.pending,
      newAdmissionsThisMonth: newThisMonth,
      pendingTasks: smartAlerts.length,
      healthScore,
      healthStatus,
    },
    // Hero snapshot strip (see WelcomeBanner.jsx). Pending Admissions and
    // Teacher Leaves Today have no backing model yet (no Admission or Leave
    // table exists) — passed as `null` rather than a fabricated number, and
    // WelcomeBanner renders those two as "Not tracked yet" instead of a
    // fake stat.
    snapshot: {
      attendancePercent: attendanceToday?.percent ?? null,
      feeCollectedToday: feesCollectedToday,
      pendingAdmissions: null,
      teacherLeavesToday: null,
    },
    studentOverview: {
      total: allStudents.length,
      segments: [
        { key: 'active', label: 'Active Students', value: Math.max(activeStudents.length - newThisMonth, 0), color: '#6d28d9' },
        { key: 'new', label: 'Recently Joined', value: newThisMonth, color: '#3b82f6' },
        { key: 'inactive', label: 'Inactive/Transferred', value: inactiveStudents, color: '#d1d5db' },
      ],
    },
    // Top 4 by enrollment, not just the first 4 created — a more useful
    // at-a-glance preview than an arbitrary insertion-order slice. decorateClass
    // (lib/classes.js) only puts capacityPercent on each *section*, not the
    // class itself, so it's rolled up here from the section capacities.
    classes: [...activeClasses]
      .sort((a, b) => b.totalStudents - a.totalStudents)
      .slice(0, 4)
      .map((c) => {
        const capacity = c.sections.reduce((sum, section) => sum + (Number(section.capacity) || 0), 0);
        return {
          id: c.id,
          name: c.name,
          sections: c.sectionCount,
          students: c.totalStudents,
          capacityPercent: capacity > 0 ? Math.min(100, Math.round((c.totalStudents / capacity) * 100)) : 0,
        };
      }),
    recentStudents,
    recentActivity,
  };
}

// Recent Activity feed (see RecentActivityCard.jsx) — a real merged
// timeline from four actual event sources: successful fee payments, new
// student admissions, submitted daily attendance records, and exams
// published (from ExamAuditLog). "Teacher leave approved" has no backing
// Leave model in the schema, so it's deliberately left out rather than
// faked — add its own source here once that data exists.
export async function getRecentActivity(limit = 15) {
  const schoolId = await resolveSchoolId();
  const perSourceLimit = limit;

  const [payments, students, attendanceRecords, examAudits] = await Promise.all([
    prisma.payment.findMany({
      where: { schoolId, status: 'SUCCESS' },
      orderBy: { paidAt: 'desc' },
      take: perSourceLimit,
      select: { id: true, amount: true, paidAt: true, student: { select: { firstName: true, lastName: true } } },
    }),
    prisma.student.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      take: perSourceLimit,
      select: { id: true, firstName: true, lastName: true, class: true, section: true, createdAt: true },
    }),
    prisma.attendance.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      take: perSourceLimit,
      select: { id: true, className: true, sectionName: true, markedBy: true, createdAt: true },
    }),
    prisma.examAuditLog.findMany({
      where: { schoolId, action: 'ExamStatusChanged' },
      orderBy: { createdAt: 'desc' },
      take: perSourceLimit,
      select: { id: true, meta: true, actorName: true, createdAt: true, exam: { select: { name: true } } },
    }),
  ]);

  const events = [
    ...payments.map((p) => ({
      id: `payment-${p.id}`,
      type: 'fee',
      message: `Fee collected — ₹${p.amount.toLocaleString('en-IN')} from ${p.student.firstName} ${p.student.lastName}`,
      timestamp: p.paidAt,
    })),
    ...students.map((s) => ({
      id: `student-${s.id}`,
      type: 'admission',
      message: `Student admitted — ${s.firstName} ${s.lastName} (${s.class}${s.section ? ` - ${s.section}` : ''})`,
      timestamp: s.createdAt,
    })),
    ...attendanceRecords.map((a) => ({
      id: `attendance-${a.id}`,
      type: 'attendance',
      message: `Attendance submitted — ${a.className}${a.sectionName ? ` - ${a.sectionName}` : ''}`,
      timestamp: a.createdAt,
    })),
    ...examAudits
      .filter((e) => e.meta?.to === 'Published')
      .map((e) => ({
        id: `exam-${e.id}`,
        type: 'exam',
        message: `Exam published — ${e.exam.name}`,
        timestamp: e.createdAt,
      })),
  ];

  return events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);
}
