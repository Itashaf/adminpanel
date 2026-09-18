function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// A short, real, deterministic reference code derived from the result's own
// database id — not a fabricated serial number, just a shorter slice of the
// real one for a human to quote/verify against.
function referenceCode(resultId) {
  return `RC-${resultId.slice(-8).toUpperCase()}`;
}

// Renders a formal, certificate-style report card — ornamental double
// border, serif masthead, a subject-wise table with a real per-subject
// performance bar, and a stamp-style Pass/Fail seal — in a new tab,
// printing once its own assets (the school logo, the web font) have
// actually loaded. Used identically from the admin Results table
// (ExamResultsClient.jsx) and the Parent portal's exam detail page
// (ParentExamDetailView.jsx), so a report card looks the same wherever
// it's generated from.
//
// `result` is the shape getExamResultForStudent returns: totalMarks,
// totalMaxMarks, percentage, grade, isPass, rank, className, sectionName,
// examName, academicSession, studentName, admissionId, subjectWise
// [{ subject, marksObtained, maxMarks, isAbsent }]. `school` is optional
// (displayName/logoUrl/addressLine1/addressLine2).
export function printReportCard({ school = {}, result }) {
  const win = window.open('', '_blank');
  if (!win) return;

  const schoolName = school.displayName || 'SchoolApp 360';
  const schoolAddress = [school.addressLine1, school.addressLine2].filter(Boolean).join(', ');
  const classLabel = `${result.className}${result.sectionName ? ` - ${result.sectionName}` : ''}`;
  const issuedOn = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const watermarkText = schoolName.toUpperCase();

  const subjectRows = (result.subjectWise || [])
    .map((s) => {
      const scored = s.isAbsent ? 'Absent' : s.marksObtained != null ? s.marksObtained : '—';
      const pct = !s.isAbsent && s.marksObtained != null && s.maxMarks ? Math.round((s.marksObtained / s.maxMarks) * 100) : 0;
      return `<tr>
        <td class="subject">${escapeHtml(s.subject)}</td>
        <td class="num">${s.maxMarks ?? '—'}</td>
        <td class="num ${s.isAbsent ? 'absent' : ''}">${escapeHtml(scored)}</td>
        <td class="bar-cell">
          <div class="bar-track"><div class="bar-fill" style="width:${s.isAbsent ? 0 : pct}%"></div></div>
        </td>
      </tr>`;
    })
    .join('');

  win.document.write(`
    <html>
      <head>
        <title>Report Card — ${escapeHtml(result.studentName)}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; }
          body { font-family: 'Inter', -apple-system, 'Segoe UI', Arial, sans-serif; color: #1f2937; margin: 0; background: #e5e7eb; }
          .page { max-width: 760px; margin: 28px auto; padding: 10px; }
          .frame { position: relative; background: #fff; border: 1px solid #111827; padding: 6px; box-shadow: 0 2px 10px rgba(0,0,0,0.12); }
          .frame-inner { position: relative; border: 1px solid #cbd5e1; padding: 0; overflow: hidden; }

          .watermark {
            position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
            transform: rotate(-32deg); pointer-events: none; z-index: 0;
          }
          .watermark span {
            font-family: 'Playfair Display', serif; font-size: 64px; font-weight: 800; color: #7C3AED;
            opacity: 0.045; white-space: nowrap; letter-spacing: 0.04em;
          }

          .band { height: 6px; background: linear-gradient(90deg, #2563EB, #7C3AED); position: relative; z-index: 1; }

          .header { position: relative; z-index: 1; display: flex; align-items: flex-start; justify-content: space-between; padding: 26px 38px 18px; border-bottom: 2px solid #111827; }
          .header .brand { display: flex; align-items: center; gap: 14px; }
          .header img { width: 54px; height: 54px; border-radius: 10px; object-fit: cover; }
          .header .brand-name { font-family: 'Playfair Display', serif; font-size: 21px; font-weight: 700; color: #111827; letter-spacing: 0.01em; }
          .header .brand-address { font-size: 10.5px; color: #6b7280; margin-top: 3px; }
          .header .title-block { text-align: right; }
          .header .title-block .title { font-size: 11px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #7C3AED; }
          .header .title-block .exam { font-size: 15px; font-weight: 700; color: #111827; margin-top: 3px; }
          .header .title-block .session { font-size: 10.5px; color: #9ca3af; margin-top: 1px; }
          .header .title-block .ref { font-size: 9.5px; color: #b0b7c3; margin-top: 6px; font-family: 'Inter', monospace; }

          .student-grid { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px 24px; padding: 18px 38px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
          .student-grid .item .label { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.07em; color: #9ca3af; font-weight: 600; }
          .student-grid .item .value { font-size: 14px; color: #111827; font-weight: 700; margin-top: 2px; }

          .section-label { position: relative; z-index: 1; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #6b7280; padding: 16px 38px 0; }

          table.marks { position: relative; z-index: 1; width: 100%; border-collapse: collapse; margin: 10px 0 0; }
          table.marks thead th { text-align: left; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; padding: 8px 38px; border-bottom: 2px solid #111827; }
          table.marks thead th.num, table.marks td.num { text-align: right; padding-right: 12px; }
          table.marks thead th.bar-cell { width: 110px; }
          table.marks tbody td { padding: 10px 12px; font-size: 13px; color: #1f2937; border-bottom: 1px solid #f3f4f6; }
          table.marks tbody td.subject { padding-left: 38px; font-weight: 500; }
          table.marks tbody td.bar-cell { padding-right: 38px; }
          table.marks tbody td.absent { color: #dc2626; font-weight: 700; }
          .bar-track { width: 100%; height: 5px; border-radius: 3px; background: #eef0f3; overflow: hidden; }
          .bar-fill { height: 100%; border-radius: 3px; background: linear-gradient(90deg, #2563EB, #7C3AED); }

          .summary-wrap { position: relative; z-index: 1; display: flex; align-items: stretch; gap: 20px; margin: 26px 38px 0; }
          .summary { flex: 1; display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid #111827; border-radius: 2px; overflow: hidden; }
          .summary .cell { padding: 14px 10px; text-align: center; border-right: 1px solid #e5e7eb; }
          .summary .cell:last-child { border-right: none; }
          .summary .cell .label { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; font-weight: 600; }
          .summary .cell .value { font-size: 18px; font-weight: 800; color: #111827; margin-top: 4px; font-variant-numeric: tabular-nums; }
          .summary .cell.grade .value { color: #7C3AED; }

          .seal {
            width: 84px; height: 84px; flex-shrink: 0; border-radius: 50%; border: 3px double;
            display: flex; align-items: center; justify-content: center; text-align: center;
            transform: rotate(-8deg); font-family: 'Playfair Display', serif; font-weight: 800; font-size: 13px;
            letter-spacing: 0.06em;
          }
          .seal.pass { border-color: #15803d; color: #15803d; }
          .seal.fail { border-color: #dc2626; color: #dc2626; }

          .signatures { position: relative; z-index: 1; display: flex; justify-content: space-between; padding: 52px 38px 10px; }
          .signatures .line { width: 170px; border-top: 1px solid #9ca3af; padding-top: 6px; font-size: 10.5px; color: #6b7280; text-align: center; }

          .footer { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; padding: 14px 38px 24px; font-size: 9.5px; color: #9ca3af; border-top: 1px solid #f3f4f6; margin-top: 18px; }

          @media print {
            body { background: #fff; }
            .page { margin: 0; padding: 0; max-width: 100%; }
            .frame { box-shadow: none; }
          }
          @page { size: portrait; margin: 12mm; }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="frame">
            <div class="frame-inner">
              <div class="watermark"><span>${escapeHtml(watermarkText)}</span></div>

              <div class="band"></div>

              <div class="header">
                <div class="brand">
                  ${school.logoUrl ? `<img src="${escapeHtml(school.logoUrl)}" alt="" />` : ''}
                  <div>
                    <div class="brand-name">${escapeHtml(schoolName)}</div>
                    ${schoolAddress ? `<div class="brand-address">${escapeHtml(schoolAddress)}</div>` : ''}
                  </div>
                </div>
                <div class="title-block">
                  <div class="title">Academic Report Card</div>
                  <div class="exam">${escapeHtml(result.examName)}</div>
                  <div class="session">Session ${escapeHtml(result.academicSession)}</div>
                  <div class="ref">Ref. ${referenceCode(result.id)} · Issued ${issuedOn}</div>
                </div>
              </div>

              <div class="student-grid">
                <div class="item">
                  <div class="label">Student Name</div>
                  <div class="value">${escapeHtml(result.studentName)}</div>
                </div>
                <div class="item">
                  <div class="label">Admission No.</div>
                  <div class="value">${escapeHtml(result.admissionId)}</div>
                </div>
                <div class="item">
                  <div class="label">Class</div>
                  <div class="value">${escapeHtml(classLabel)}</div>
                </div>
              </div>

              <p class="section-label">Subject-wise Performance</p>
              <table class="marks">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th class="num">Max</th>
                    <th class="num">Obtained</th>
                    <th class="bar-cell">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  ${subjectRows}
                </tbody>
              </table>

              <div class="summary-wrap">
                <div class="summary">
                  <div class="cell">
                    <div class="label">Total</div>
                    <div class="value">${result.totalMarks}/${result.totalMaxMarks}</div>
                  </div>
                  <div class="cell">
                    <div class="label">Percentage</div>
                    <div class="value">${result.percentage.toFixed(1)}%</div>
                  </div>
                  <div class="cell grade">
                    <div class="label">Grade</div>
                    <div class="value">${escapeHtml(result.grade)}</div>
                  </div>
                  <div class="cell">
                    <div class="label">Class Rank</div>
                    <div class="value">${result.rank ?? '—'}</div>
                  </div>
                </div>
                <div class="seal ${result.isPass ? 'pass' : 'fail'}">${result.isPass ? 'PASS' : 'FAIL'}</div>
              </div>

              <div class="signatures">
                <div class="line">Class Teacher</div>
                <div class="line">Principal</div>
              </div>

              <div class="footer">
                <span>Computer-generated — no signature required for verification.</span>
                <span>${referenceCode(result.id)}</span>
              </div>
            </div>
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
