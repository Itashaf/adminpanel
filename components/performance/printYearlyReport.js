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

function monthShortLabel(month) {
  const [year, m] = month.split('-');
  return new Date(Number(year), Number(m) - 1, 1).toLocaleDateString('en-US', { month: 'short' });
}

// Same SVG-polyline sparkline as GrowthTrendChart.jsx, inlined as static
// markup (print windows don't run React) — small enough to just duplicate
// rather than pull React into a plain-string HTML generator.
function trendSvg(trend) {
  if (!trend.length) return '<p class="empty">No monthly reports yet this session.</p>';
  const W = 500,
    H = 62,
    PAD = { top: 5, right: 10, bottom: 13, left: 4 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const coords = trend.map((p, i) => ({
    x: PAD.left + (trend.length > 1 ? (i / (trend.length - 1)) * innerW : innerW / 2),
    y: PAD.top + innerH - (p.academicPercent / 100) * innerH,
    month: p.month,
  }));
  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${PAD.top + innerH} L ${coords[0].x} ${PAD.top + innerH} Z`;
  const points = coords.map((c) => `<circle cx="${c.x}" cy="${c.y}" r="2.5" fill="#000" />`).join('');
  const labels = coords.map((c) => `<text x="${c.x}" y="${H - 3}" text-anchor="middle" font-size="7" fill="#6b7280">${escapeHtml(monthShortLabel(c.month))}</text>`).join('');
  return `<div style="padding:6px 10px;"><svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;">
    <path d="${areaPath}" fill="#000" fill-opacity="0.05" stroke="none" />
    <path d="${linePath}" fill="none" stroke="#000" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
    ${points}${labels}
  </svg></div>`;
}

// One student's report as a single `.page` div (no <html>/<head> wrapper)
// — shared by both the single-student print (printYearlyReport) and the
// bulk print (printYearlyReportsBulk), same split as printMonthlyReport.js.
function reportPageHtml({ school, report, academicSession }) {
  const schoolName = school.displayName || 'SchoolApp 360';
  const schoolAddress = [school.addressLine1, school.addressLine2].filter(Boolean).join(', ');
  const issuedOn = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  const academicRows = (report.academicPerformance || [])
    .map(
      (s) => `<tr>
        <td>${escapeHtml(s.subjectName)}</td>
        <td class="center">${s.averagePercent}%</td>
        <td class="center strong">${escapeHtml(s.grade)}</td>
      </tr>`
    )
    .join('');

  const activityRows = (report.activities || [])
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

  const remarkText = (report.teacherRemark || '').slice(0, 1000);

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
              <div class="title">Yearly Performance Report</div>
              <div class="month">Session ${escapeHtml(academicSession)}</div>
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
            <div class="box-title">Yearly Attendance</div>
            <div class="stat-row">
              <div class="stat-cell"><div class="n">${report.attendance.workingDays}</div><div class="l">Working Days</div></div>
              <div class="stat-cell"><div class="n">${report.attendance.presentDays}</div><div class="l">Present Days</div></div>
              <div class="stat-cell"><div class="n">${report.attendance.absentDays}</div><div class="l">Absent Days</div></div>
              <div class="stat-cell"><div class="n">${report.attendance.percent}%</div><div class="l">Attendance</div></div>
            </div>
          </div>

          <div class="box">
            <div class="box-title">Academic Summary</div>
            ${
              academicRows
                ? `<table><thead><tr><th>Subject</th><th class="center">Average %</th><th class="center">Grade</th></tr></thead><tbody>${academicRows}</tbody></table>`
                : '<p class="empty">No tests recorded this session.</p>'
            }
          </div>

          <div class="box">
            <div class="box-title">Activities &amp; Achievements</div>
            ${
              activityRows
                ? `<table><thead><tr><th>Activity</th><th>Position / Details</th></tr></thead><tbody>${activityRows}</tbody></table>`
                : '<p class="empty">No activities recorded this session.</p>'
            }
          </div>

          <div class="box">
            <div class="box-title">Holistic Performance</div>
            <table><thead><tr><th>Category</th><th>Rating</th></tr></thead><tbody>${holisticRows}</tbody></table>
          </div>

          <div class="box">
            <div class="box-title">Growth Trend</div>
            ${trendSvg(report.growthTrend || [])}
          </div>

          <div class="box">
            <div class="box-title">Teacher Remarks</div>
            ${remarkText ? `<p class="remark-text">${escapeHtml(remarkText)}</p>` : '<p class="remark-text">No remarks recorded.</p>'}
          </div>

          <div class="box overall">
            <div class="overall-left">
              <div class="label">Final Rating</div>
              <div class="value big">${report.finalRating ? escapeHtml(RATING_LABEL[report.finalRating]) : 'Not Rated'}</div>
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
          .page { width: 210mm; min-height: 297mm; margin: 20px auto; background: #fff; padding: 10mm 12mm; box-shadow: 0 2px 10px rgba(0,0,0,0.12); }

          .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 9px; }
          .header .brand { display: flex; align-items: center; gap: 8px; }
          .header .logo { width: 32px; height: 32px; border: 1.5px solid #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
          .header .logo img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
          .header .brand-name { font-size: 15px; font-weight: 800; color: #000; letter-spacing: 0.01em; }
          .header .brand-tagline { font-size: 7.5px; color: #444; margin-top: 1px; letter-spacing: 0.05em; }
          .header .title-block { text-align: right; }
          .header .title { font-size: 11px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: #000; }
          .header .month { font-size: 9px; color: #333; margin-top: 2px; }

          .box { margin-top: 7px; border: 1px solid #000; }
          .box-title { font-size: 9px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; color: #000; background: #ececec; padding: 4px 10px; border-bottom: 1px solid #000; }

          .student-grid { display: grid; grid-template-columns: repeat(4, 1fr); }
          .student-grid > div { padding: 6px 10px; border-right: 1px solid #d1d5db; }
          .student-grid > div:last-child { border-right: none; }
          .student-grid .label { font-size: 7px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; font-weight: 600; }
          .student-grid .value { font-size: 10px; color: #000; font-weight: 700; margin-top: 2px; }

          .stat-row { display: grid; grid-template-columns: repeat(4, 1fr); padding: 6px 10px; }
          .stat-cell { text-align: center; border-right: 1px solid #d1d5db; }
          .stat-cell:last-child { border-right: none; }
          .stat-cell .n { font-size: 13px; font-weight: 800; color: #000; }
          .stat-cell .l { font-size: 7px; color: #6b7280; margin-top: 1px; }

          table { width: 100%; border-collapse: collapse; font-size: 8.5px; }
          thead tr { background: #f5f5f5; }
          th { text-align: left; font-size: 7px; text-transform: uppercase; letter-spacing: 0.03em; color: #444; font-weight: 700; padding: 4px 10px; border-bottom: 1px solid #000; }
          td { padding: 4px 10px; border-bottom: 1px solid #e5e7eb; color: #111; }
          tbody tr:last-child td { border-bottom: none; }
          th.center, td.center { text-align: center; }
          td.strong { font-weight: 700; }

          .empty, .remark-text { font-size: 8.5px; color: #333; line-height: 1.4; padding: 8px 10px; }

          .overall { display: flex; align-items: center; padding: 7px 10px; }
          .overall-left { flex: 1; }
          .overall .label { font-size: 7.5px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; font-weight: 700; }
          .overall .value.big { font-size: 13px; font-weight: 800; color: #000; margin-top: 1px; }
          .sign { text-align: center; margin-left: 20px; }
          .sign-line { width: 90px; border-bottom: 1px solid #000; margin-bottom: 3px; }
          .sign-label { font-size: 7px; font-weight: 700; color: #000; line-height: 1.2; }

          .footer { margin-top: 8px; padding-top: 5px; border-top: 1px solid #000; font-size: 6.5px; color: #444; line-height: 1.3; }

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

// Single A4 page, same browser-print convention as printMonthlyReport.js
// (window.print(), no PDF library, no real ZIP — this app has never
// generated real PDF bytes anywhere).
export function printYearlyReport({ school = {}, report, academicSession }) {
  const win = window.open('', '_blank');
  if (!win) return;

  win.document.write(
    documentHtml({
      title: `Yearly Report — ${report.studentName} — ${academicSession}`,
      pagesHtml: reportPageHtml({ school, report, academicSession }),
    })
  );
  win.document.close();
  win.focus();
}

// "Print Selected" — every selected student's yearly report as its own
// page, page-break-after between them, one print job. Same convention as
// printMonthlyReportsBulk.
export function printYearlyReportsBulk({ school = {}, reports, academicSession }) {
  if (!reports.length) return;
  const win = window.open('', '_blank');
  if (!win) return;

  const pagesHtml = reports
    .map((report, i) => {
      const html = reportPageHtml({ school, report, academicSession });
      return i < reports.length - 1 ? html.replace('<div class="page">', '<div class="page" style="page-break-after: always;">') : html;
    })
    .join('');

  win.document.write(
    documentHtml({
      title: `Yearly Reports — ${academicSession} — ${reports.length} students`,
      pagesHtml,
    })
  );
  win.document.close();
  win.focus();
}
