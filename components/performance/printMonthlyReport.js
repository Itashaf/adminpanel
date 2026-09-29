function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const HOLISTIC_LABEL = { EXCELLENT: 'Excellent', GOOD: 'Good', SUPPORT: 'Support' };
const HOLISTIC_CATEGORIES = [
  { key: 'discipline', label: 'Discipline' },
  { key: 'homeworkCompletion', label: 'Homework Completion' },
  { key: 'englishCommunication', label: 'English Communication' },
  { key: 'punctuality', label: 'Punctuality' },
  { key: 'hygiene', label: 'Hygiene' },
];
const ACHIEVEMENT_LABEL = { PARTICIPANT: 'Participant', FIRST: '1st Position', SECOND: '2nd Position', THIRD: '3rd Position', SPECIAL_MENTION: 'Special Mention' };
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
      (s) => `<tr>
        <td>${escapeHtml(s.subjectName)}</td>
        <td>${escapeHtml(s.latestTest || '—')}</td>
        <td class="center">${s.averagePercent}%</td>
        <td class="center strong">${escapeHtml(s.status)}</td>
      </tr>`
    )
    .join('');

  const activities = report.activities || [];
  const activityRows = activities
    .map(
      (a) => `<tr>
        <td>${escapeHtml(a.activityName)}</td>
        <td class="strong">${escapeHtml(ACHIEVEMENT_LABEL[a.achievement] || a.achievement)}</td>
      </tr>`
    )
    .join('');

  const holisticRows = HOLISTIC_CATEGORIES
    .map(({ key, label: categoryLabel }) => {
      const value = report.holistic?.[key];
      const label = value ? HOLISTIC_LABEL[value] : '—';
      return `<tr><td>${categoryLabel}</td><td class="strong">${label}</td></tr>`;
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
              <div class="logo">${school.logoUrl ? `<img src="${escapeHtml(school.logoUrl)}" alt="" />` : ''}</div>
              <div>
                <div class="brand-name">${escapeHtml(schoolName)}</div>
                ${schoolAddress ? `<div class="brand-tagline">${escapeHtml(schoolAddress)}</div>` : ''}
              </div>
            </div>
            <div class="title-block">
              <div class="title">Monthly Performance Report</div>
              <div class="month">${escapeHtml(monthLabel(month))} &nbsp;|&nbsp; Session ${escapeHtml(academicSession)}</div>
            </div>
          </div>

          <div class="box">
            <div class="box-title">Student Information</div>
            <div class="student-grid">
              <div><div class="label">Student Name</div><div class="value">${escapeHtml(report.studentName)}</div></div>
              <div><div class="label">Admission No.</div><div class="value">${escapeHtml(report.admissionId)}</div></div>
              <div><div class="label">Class</div><div class="value">${escapeHtml(report.className)}</div></div>
              <div><div class="label">Section</div><div class="value">${escapeHtml(report.sectionName)}</div></div>
            </div>
          </div>

          <div class="box">
            <div class="box-title">Attendance Summary</div>
            <div class="stat-row">
              <div class="stat-cell"><div class="n">${report.attendance.presentDays}</div><div class="l">Present Days</div></div>
              <div class="stat-cell"><div class="n">${report.attendance.absentDays}</div><div class="l">Absent Days</div></div>
              <div class="stat-cell"><div class="n">${report.attendance.lateDays}</div><div class="l">Late Days</div></div>
              <div class="stat-cell"><div class="n">${report.attendance.percent}%</div><div class="l">Attendance</div></div>
            </div>
          </div>

          <div class="box">
            <div class="box-title">Academic Performance</div>
            ${
              academicRows
                ? `<table><thead><tr><th>Subject</th><th>Latest Test</th><th class="center">Average %</th><th class="center">Performance</th></tr></thead><tbody>${academicRows}</tbody></table>`
                : '<p class="empty">No tests recorded this month.</p>'
            }
          </div>

          <div class="box">
            <div class="box-title">Activities &amp; Achievements</div>
            ${
              activityRows
                ? `<table><thead><tr><th>Activity</th><th>Position / Details</th></tr></thead><tbody>${activityRows}</tbody></table>`
                : '<p class="empty">No activities recorded this month.</p>'
            }
          </div>

          <div class="box">
            <div class="box-title">Holistic Assessment</div>
            <table><thead><tr><th>Category</th><th>Rating</th></tr></thead><tbody>${holisticRows}</tbody></table>
          </div>

          <div class="box">
            <div class="box-title">Class/Subject Teacher Remarks</div>
            ${remarkText ? `<p class="remark-text">${escapeHtml(remarkText)}</p>` : '<p class="remark-text">No remarks recorded.</p>'}
          </div>

          <div class="box overall">
            <div class="overall-left">
              <div class="label">Overall Rating</div>
              <div class="value big">${report.overallRating ? escapeHtml(RATING_LABEL[report.overallRating]) : 'Not Rated'}</div>
            </div>
            <div class="sign"><div class="sign-line"></div><div class="sign-label">Class Teacher<br/>Signature</div></div>
            <div class="sign"><div class="sign-line"></div><div class="sign-label">Principal<br/>Signature</div></div>
          </div>

          <div class="footer">
            <span>Computer-generated on ${escapeHtml(issuedOn)}.<br/>${escapeHtml(schoolName)}.</span>
          </div>
        </div>`;
}

const DOCUMENT_STYLE = `
          * { box-sizing: border-box; }
          body { font-family: 'Inter', -apple-system, 'Segoe UI', Arial, sans-serif; color: #000; margin: 0; background: #e5e7eb; }
          .page { width: 210mm; min-height: 297mm; margin: 20px auto; background: #fff; padding: 14mm 16mm; box-shadow: 0 2px 10px rgba(0,0,0,0.12); }

          .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 14px; }
          .header .brand { display: flex; align-items: center; gap: 10px; }
          .header .logo { width: 42px; height: 42px; border: 1.5px solid #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
          .header .logo img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
          .header .brand-name { font-size: 19px; font-weight: 800; color: #000; letter-spacing: 0.01em; }
          .header .brand-tagline { font-size: 9px; color: #444; margin-top: 2px; letter-spacing: 0.05em; }
          .header .title-block { text-align: right; }
          .header .title { font-size: 13px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: #000; }
          .header .month { font-size: 10.5px; color: #333; margin-top: 3px; }

          .box { margin-top: 12px; border: 1px solid #000; }
          .box-title { font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #000; background: #ececec; padding: 6px 12px; border-bottom: 1px solid #000; }

          .student-grid { display: grid; grid-template-columns: repeat(4, 1fr); }
          .student-grid > div { padding: 10px 12px; border-right: 1px solid #d1d5db; }
          .student-grid > div:last-child { border-right: none; }
          .student-grid .label { font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; font-weight: 600; }
          .student-grid .value { font-size: 12px; color: #000; font-weight: 700; margin-top: 3px; }

          .stat-row { display: grid; grid-template-columns: repeat(4, 1fr); padding: 10px 12px; }
          .stat-cell { text-align: center; border-right: 1px solid #d1d5db; }
          .stat-cell:last-child { border-right: none; }
          .stat-cell .n { font-size: 17px; font-weight: 800; color: #000; }
          .stat-cell .l { font-size: 8.5px; color: #6b7280; margin-top: 2px; }

          table { width: 100%; border-collapse: collapse; font-size: 10px; }
          thead tr { background: #f5f5f5; }
          th { text-align: left; font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.04em; color: #444; font-weight: 700; padding: 7px 12px; border-bottom: 1px solid #000; }
          td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #111; }
          tbody tr:last-child td { border-bottom: none; }
          th.center, td.center { text-align: center; }
          td.strong { font-weight: 700; }

          .empty, .remark-text { font-size: 10px; color: #333; line-height: 1.5; padding: 12px; }

          .overall { display: flex; align-items: center; padding: 12px 16px; }
          .overall-left { flex: 1; }
          .overall .label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; font-weight: 700; }
          .overall .value.big { font-size: 17px; font-weight: 800; color: #000; margin-top: 2px; }
          .sign { text-align: center; margin-left: 32px; }
          .sign-line { width: 130px; border-bottom: 1px solid #000; margin-bottom: 4px; }
          .sign-label { font-size: 8.5px; font-weight: 700; color: #000; line-height: 1.3; }

          .footer { margin-top: 16px; padding-top: 8px; border-top: 1px solid #000; font-size: 8px; color: #444; line-height: 1.4; }

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
