function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const HOLISTIC_LABEL = { EXCELLENT: 'Excellent', GOOD: 'Good', SUPPORT: 'Support' };
const HOLISTIC_COLOR = { EXCELLENT: '#059669', GOOD: '#d97706', SUPPORT: '#dc2626' };
const HOLISTIC_CATEGORIES = [
  { key: 'discipline', label: 'Discipline' },
  { key: 'homeworkCompletion', label: 'Homework Completion' },
  { key: 'englishCommunication', label: 'English Communication' },
  { key: 'punctuality', label: 'Punctuality' },
  { key: 'hygiene', label: 'Hygiene' },
];
const ACHIEVEMENT_LABEL = { PARTICIPANT: 'Participant', FIRST: '1st', SECOND: '2nd', THIRD: '3rd', SPECIAL_MENTION: 'Special Mention' };
const PERFORMANCE_COLOR = { Excellent: '#059669', Good: '#059669', Average: '#d97706', 'Needs Support': '#dc2626' };
const RATING_LABEL = { EXCELLENT: 'Excellent', GOOD: 'Good', IMPROVING: 'Improving', SUPPORT_NEEDED: 'Support Needed' };

function monthLabel(month) {
  const [year, m] = month.split('-');
  return new Date(Number(year), Number(m) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// One student's report as a single `.page` div (no <html>/<head> wrapper)
// — shared by both the single-student print (printMonthlyReport) and the
// bulk print (printMonthlyReportsBulk), so the two can never drift apart
// into two different-looking layouts.
function reportPageHtml({ school, report, academicSession, month }) {
  const schoolName = school.displayName || 'SchoolApp 360';
  const schoolAddress = [school.addressLine1, school.addressLine2].filter(Boolean).join(', ');
  const issuedOn = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  const academicRows = (report.academicPerformance || [])
    .map(
      (s) => `<div class="tl-card">
        <div class="tl-dot" style="background:${PERFORMANCE_COLOR[s.status] || '#9ca3af'}"></div>
        <div class="tl-body">
          <div class="tl-subject">${escapeHtml(s.subjectName)}</div>
          <div class="tl-status">${escapeHtml(s.status)}</div>
        </div>
        <div class="tl-percent">${s.averagePercent}%</div>
      </div>`
    )
    .join('');

  const activities = report.activities || [];
  const shownActivities = activities.slice(0, 4);
  const extraCount = activities.length - shownActivities.length;
  const activityChips = shownActivities
    .map((a) => `<span class="chip">${escapeHtml(a.activityName)} <b>${escapeHtml(ACHIEVEMENT_LABEL[a.achievement] || a.achievement)}</b></span>`)
    .join('');

  const holisticRows = HOLISTIC_CATEGORIES
    .map(({ key, label: categoryLabel }) => {
      const value = report.holistic?.[key];
      const label = value ? HOLISTIC_LABEL[value] : '—';
      const color = value ? HOLISTIC_COLOR[value] : '#9ca3af';
      return `<div class="holistic-cell">
        <div class="holistic-label">${categoryLabel}</div>
        <div class="holistic-value" style="color:${color}">${label}</div>
      </div>`;
    })
    .join('');

  // Remark text is already capped at 500 chars by the form itself — a hard
  // truncate here is just the print-page's own safety net, never the
  // primary limit.
  const remarkText = (report.remarks?.remarkText || '').slice(0, 500);

  return `
        <div class="page">
          <div class="header">
            <div class="brand">
              ${school.logoUrl ? `<img src="${escapeHtml(school.logoUrl)}" alt="" />` : ''}
              <div>
                <div class="brand-name">${escapeHtml(schoolName)}</div>
                ${schoolAddress ? `<div class="brand-address">${escapeHtml(schoolAddress)}</div>` : ''}
              </div>
            </div>
            <div class="title-block">
              <div class="title">Monthly Performance Report</div>
              <div class="month">${escapeHtml(monthLabel(month))} · ${escapeHtml(academicSession)}</div>
            </div>
          </div>

          <div class="student-grid">
            <div><div class="label">Student</div><div class="value">${escapeHtml(report.studentName)}</div></div>
            <div><div class="label">Admission No.</div><div class="value">${escapeHtml(report.admissionId)}</div></div>
            <div><div class="label">Class</div><div class="value">${escapeHtml(report.className)}</div></div>
            <div><div class="label">Section</div><div class="value">${escapeHtml(report.sectionName)}</div></div>
          </div>

          <div class="section">
            <div class="section-title">Attendance</div>
            <div class="stat-row">
              <div class="stat-cell"><div class="n">${report.attendance.presentDays}</div><div class="l">Present Days</div></div>
              <div class="stat-cell"><div class="n">${report.attendance.absentDays}</div><div class="l">Absent Days</div></div>
              <div class="stat-cell"><div class="n">${report.attendance.lateDays}</div><div class="l">Late Days</div></div>
              <div class="stat-cell"><div class="n">${report.attendance.percent}%</div><div class="l">Attendance</div></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Academic Performance</div>
            ${academicRows ? `<div class="tl-grid">${academicRows}</div>` : '<div class="remark-text">No tests recorded this month.</div>'}
          </div>

          <div class="section">
            <div class="section-title">Activities &amp; Achievements</div>
            ${activityChips ? `<div>${activityChips}${extraCount > 0 ? `<span class="chip">+${extraCount} more</span>` : ''}</div>` : '<div class="remark-text">No activities recorded this month.</div>'}
          </div>

          <div class="section">
            <div class="section-title">Holistic Assessment</div>
            <div class="holistic-row">${holisticRows}</div>
          </div>

          <div class="section">
            <div class="section-title">Class/Subject Teacher Remarks</div>
            ${remarkText ? `<p class="remark-text">${escapeHtml(remarkText)}</p>` : '<p class="remark-text">No remarks recorded.</p>'}
          </div>

          <div class="rating-band">
            <span class="l">Overall Rating</span>
            <span class="v">${report.overallRating ? escapeHtml(RATING_LABEL[report.overallRating]) : 'Not rated'}</span>
          </div>

          <div class="footer">
            <span>Computer-generated on ${escapeHtml(issuedOn)}.</span>
            <span>${escapeHtml(schoolName)}</span>
          </div>
        </div>`;
}

const DOCUMENT_STYLE = `
          * { box-sizing: border-box; }
          body { font-family: 'Inter', -apple-system, 'Segoe UI', Arial, sans-serif; color: #1f2937; margin: 0; background: #e5e7eb; }
          .page { width: 210mm; min-height: 297mm; margin: 20px auto; background: #fff; padding: 14mm 16mm; box-shadow: 0 2px 10px rgba(0,0,0,0.12); }

          .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #111827; padding-bottom: 10px; }
          .header .brand { display: flex; align-items: center; gap: 10px; }
          .header img { width: 40px; height: 40px; border-radius: 8px; object-fit: cover; }
          .header .brand-name { font-size: 16px; font-weight: 800; color: #111827; }
          .header .brand-address { font-size: 9px; color: #6b7280; margin-top: 1px; }
          .header .title-block { text-align: right; }
          .header .title { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #7C3AED; }
          .header .month { font-size: 13px; font-weight: 700; color: #111827; margin-top: 2px; }

          .student-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 12px; padding: 10px 14px; background: #f9fafb; border-radius: 8px; }
          .student-grid .label { font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; font-weight: 600; }
          .student-grid .value { font-size: 12px; color: #111827; font-weight: 700; margin-top: 2px; }

          .section { margin-top: 12px; }
          .section-title { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #6b7280; margin-bottom: 6px; }

          .stat-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
          .stat-cell { background: #f9fafb; border-radius: 6px; padding: 8px 10px; text-align: center; }
          .stat-cell .n { font-size: 15px; font-weight: 800; color: #111827; }
          .stat-cell .l { font-size: 8px; color: #9ca3af; margin-top: 1px; }

          .tl-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
          .tl-card { display: flex; align-items: center; gap: 6px; background: #f9fafb; border-radius: 6px; padding: 6px 8px; }
          .tl-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
          .tl-body { flex: 1; min-width: 0; }
          .tl-subject { font-size: 10px; font-weight: 700; color: #111827; }
          .tl-status { font-size: 8px; color: #6b7280; }
          .tl-percent { font-size: 12px; font-weight: 800; color: #111827; }

          .chip { display: inline-block; font-size: 9px; background: #eef2ff; color: #3730a3; border-radius: 999px; padding: 3px 9px; margin: 2px 4px 2px 0; }
          .chip b { font-weight: 700; }

          .holistic-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
          .holistic-cell { text-align: center; background: #f9fafb; border-radius: 6px; padding: 6px 4px; }
          .holistic-label { font-size: 8px; color: #9ca3af; text-transform: uppercase; }
          .holistic-value { font-size: 10.5px; font-weight: 700; margin-top: 2px; }

          .remark-text { font-size: 10px; color: #374151; line-height: 1.5; margin-top: 4px; }

          .rating-band { display: flex; align-items: center; justify-content: space-between; margin-top: 14px; padding: 10px 14px; border: 1.5px solid #111827; border-radius: 8px; }
          .rating-band .l { font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; font-weight: 700; }
          .rating-band .v { font-size: 14px; font-weight: 800; color: #111827; }

          .footer { display: flex; justify-content: space-between; margin-top: 16px; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 8px; color: #9ca3af; }

          @media print {
            body { background: #fff; }
            .page { margin: 0; box-shadow: none; }
          }
          @page { size: A4 portrait; margin: 0; }`;

function documentHtml({ title, pagesHtml }) {
  return `
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>${DOCUMENT_STYLE}</style>
      </head>
      <body>
        ${pagesHtml}
        <script>
          window.onload = function () { window.print(); };
        </script>
      </body>
    </html>
  `;
}

// Single-student print — unchanged public shape from before the refactor.
export function printMonthlyReport({ school = {}, report, academicSession, month }) {
  const win = window.open('', '_blank');
  if (!win) return;

  win.document.write(
    documentHtml({
      title: `Monthly Report — ${report.studentName} — ${monthLabel(month)}`,
      pagesHtml: reportPageHtml({ school, report, academicSession, month }),
    })
  );
  win.document.close();
  win.focus();
}

// "Print Selected" / "Print Class" / "Print Section" — every selected
// student's report as its own `.page`, page-break-after between them, one
// print job. Confirmed approach: browser Print only (Ctrl+P / Save as
// PDF), no PDF-generation library, no real ZIP file — this app has never
// generated real PDF bytes anywhere, same convention as printReportCard.js.
export function printMonthlyReportsBulk({ school = {}, reports, academicSession, month }) {
  if (!reports.length) return;
  const win = window.open('', '_blank');
  if (!win) return;

  const pagesHtml = reports
    .map((report, i) => {
      const html = reportPageHtml({ school, report, academicSession, month });
      // No page-break after the very last page — an extra blank sheet at
      // the end of a "Save as PDF" is the kind of thing a teacher notices
      // and reports as a bug.
      return i < reports.length - 1 ? html.replace('<div class="page">', '<div class="page" style="page-break-after: always;">') : html;
    })
    .join('');

  win.document.write(
    documentHtml({
      title: `Monthly Reports — ${monthLabel(month)} — ${reports.length} students`,
      pagesHtml,
    })
  );
  win.document.close();
  win.focus();
}
