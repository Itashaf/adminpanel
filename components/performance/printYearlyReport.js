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
const RATING_LABEL = { EXCELLENT: 'Excellent', GOOD: 'Good', IMPROVING: 'Improving', SUPPORT_NEEDED: 'Support Needed' };

function monthShortLabel(month) {
  const [year, m] = month.split('-');
  return new Date(Number(year), Number(m) - 1, 1).toLocaleDateString('en-US', { month: 'short' });
}

// Same SVG-polyline sparkline as GrowthTrendChart.jsx, inlined as static
// markup (print windows don't run React) — small enough to just duplicate
// rather than pull React into a plain-string HTML generator.
function trendSvg(trend) {
  if (!trend.length) return '<p style="font-size:9px;color:#9ca3af;text-align:center;padding:10px 0;">No monthly reports yet this session.</p>';
  const W = 500,
    H = 90,
    PAD = { top: 6, right: 10, bottom: 16, left: 4 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const coords = trend.map((p, i) => ({
    x: PAD.left + (trend.length > 1 ? (i / (trend.length - 1)) * innerW : innerW / 2),
    y: PAD.top + innerH - (p.academicPercent / 100) * innerH,
    month: p.month,
  }));
  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${PAD.top + innerH} L ${coords[0].x} ${PAD.top + innerH} Z`;
  const points = coords.map((c) => `<circle cx="${c.x}" cy="${c.y}" r="2.5" fill="#7C3AED" />`).join('');
  const labels = coords.map((c) => `<text x="${c.x}" y="${H - 4}" text-anchor="middle" font-size="8" fill="#9ca3af">${escapeHtml(monthShortLabel(c.month))}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;">
    <path d="${areaPath}" fill="#7C3AED" fill-opacity="0.08" stroke="none" />
    <path d="${linePath}" fill="none" stroke="#7C3AED" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
    ${points}${labels}
  </svg>`;
}

// Single A4 page, same browser-print convention as printMonthlyReport.js
// (window.print(), no PDF library, no real ZIP — this app has never
// generated real PDF bytes anywhere).
export function printYearlyReport({ school = {}, report, academicSession }) {
  const win = window.open('', '_blank');
  if (!win) return;

  const schoolName = school.displayName || 'SchoolApp 360';
  const schoolAddress = [school.addressLine1, school.addressLine2].filter(Boolean).join(', ');
  const issuedOn = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  const academicRows = (report.academicPerformance || [])
    .map(
      (s) => `<tr>
        <td style="padding:5px 8px;font-weight:600;color:#111827;">${escapeHtml(s.subjectName)}</td>
        <td style="padding:5px 8px;text-align:right;color:#374151;">${s.averagePercent}%</td>
        <td style="padding:5px 8px;text-align:right;font-weight:700;color:#7C3AED;">${escapeHtml(s.grade)}</td>
      </tr>`
    )
    .join('');

  const activities = report.activities || [];
  const shownActivities = activities.slice(0, 8);
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

  const remarkText = (report.teacherRemark || '').slice(0, 1000);

  win.document.write(`
    <html>
      <head>
        <title>Yearly Report — ${escapeHtml(report.studentName)} — ${escapeHtml(academicSession)}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
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
          .header .session { font-size: 13px; font-weight: 700; color: #111827; margin-top: 2px; }

          .student-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 12px; padding: 10px 14px; background: #f9fafb; border-radius: 8px; }
          .student-grid .label { font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; font-weight: 600; }
          .student-grid .value { font-size: 12px; color: #111827; font-weight: 700; margin-top: 2px; }

          .section { margin-top: 11px; }
          .section-title { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #6b7280; margin-bottom: 5px; }

          .stat-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
          .stat-cell { background: #f9fafb; border-radius: 6px; padding: 7px 10px; text-align: center; }
          .stat-cell .n { font-size: 14px; font-weight: 800; color: #111827; }
          .stat-cell .l { font-size: 7.5px; color: #9ca3af; margin-top: 1px; }

          table.academic { width: 100%; border-collapse: collapse; font-size: 10px; }
          table.academic th { text-align: left; font-size: 8px; text-transform: uppercase; color: #9ca3af; padding: 4px 8px; border-bottom: 1px solid #e5e7eb; }
          table.academic th:not(:first-child) { text-align: right; }
          table.academic tr:nth-child(even) { background: #fafafa; }

          .chip { display: inline-block; font-size: 8.5px; background: #eef2ff; color: #3730a3; border-radius: 999px; padding: 3px 8px; margin: 2px 3px 2px 0; }
          .chip b { font-weight: 700; }

          .holistic-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
          .holistic-cell { text-align: center; background: #f9fafb; border-radius: 6px; padding: 5px 4px; }
          .holistic-label { font-size: 7.5px; color: #9ca3af; text-transform: uppercase; }
          .holistic-value { font-size: 10px; font-weight: 700; margin-top: 2px; }

          .remark-text { font-size: 9.5px; color: #374151; line-height: 1.5; margin-top: 4px; }

          .rating-band { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; padding: 9px 14px; border: 1.5px solid #111827; border-radius: 8px; }
          .rating-band .l { font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; font-weight: 700; }
          .rating-band .v { font-size: 13px; font-weight: 800; color: #111827; }

          .footer { display: flex; justify-content: space-between; margin-top: 14px; padding-top: 7px; border-top: 1px solid #e5e7eb; font-size: 8px; color: #9ca3af; }

          @media print {
            body { background: #fff; }
            .page { margin: 0; box-shadow: none; }
          }
          @page { size: A4 portrait; margin: 0; }
        </style>
      </head>
      <body>
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
              <div class="title">Yearly Performance Report</div>
              <div class="session">${escapeHtml(academicSession)}</div>
            </div>
          </div>

          <div class="student-grid">
            <div><div class="label">Student</div><div class="value">${escapeHtml(report.studentName)}</div></div>
            <div><div class="label">Admission No.</div><div class="value">${escapeHtml(report.admissionId)}</div></div>
            <div><div class="label">Class</div><div class="value">${escapeHtml(report.className)}</div></div>
            <div><div class="label">Section</div><div class="value">${escapeHtml(report.sectionName)}</div></div>
          </div>

          <div class="section">
            <div class="section-title">Yearly Attendance</div>
            <div class="stat-row">
              <div class="stat-cell"><div class="n">${report.attendance.workingDays}</div><div class="l">Working Days</div></div>
              <div class="stat-cell"><div class="n">${report.attendance.presentDays}</div><div class="l">Present Days</div></div>
              <div class="stat-cell"><div class="n">${report.attendance.absentDays}</div><div class="l">Absent Days</div></div>
              <div class="stat-cell"><div class="n">${report.attendance.percent}%</div><div class="l">Attendance</div></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Academic Summary</div>
            ${
              academicRows
                ? `<table class="academic"><thead><tr><th>Subject</th><th>Avg %</th><th>Grade</th></tr></thead><tbody>${academicRows}</tbody></table>`
                : '<div class="remark-text">No tests recorded this session.</div>'
            }
          </div>

          <div class="section">
            <div class="section-title">Activities &amp; Achievements</div>
            ${activityChips ? `<div>${activityChips}${extraCount > 0 ? `<span class="chip">+${extraCount} more</span>` : ''}</div>` : '<div class="remark-text">No activities recorded this session.</div>'}
          </div>

          <div class="section">
            <div class="section-title">Holistic Performance</div>
            <div class="holistic-row">${holisticRows}</div>
          </div>

          <div class="section">
            <div class="section-title">Growth Trend</div>
            ${trendSvg(report.growthTrend || [])}
          </div>

          <div class="section">
            <div class="section-title">Teacher Remarks</div>
            ${remarkText ? `<p class="remark-text">${escapeHtml(remarkText)}</p>` : '<p class="remark-text">No remarks recorded.</p>'}
          </div>

          <div class="rating-band">
            <span class="l">Final Rating</span>
            <span class="v">${report.finalRating ? escapeHtml(RATING_LABEL[report.finalRating]) : 'Not rated'}</span>
          </div>

          <div class="footer">
            <span>Computer-generated on ${escapeHtml(issuedOn)}.</span>
            <span>${escapeHtml(schoolName)}</span>
          </div>
        </div>
        <script>
          window.onload = function () { window.print(); };
        </script>
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
}
