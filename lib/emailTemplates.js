// Table-based layout with inline styles throughout — deliberately not JSX/
// Tailwind, since almost no email client (Gmail, Outlook, Apple Mail
// included) reliably supports CSS grid/flex. A <style> block with a media
// query IS safe to rely on though (Gmail app/web, Apple Mail, Outlook.com all
// honor it; only legacy Outlook desktop ignores it, and degrades gracefully
// to the desktop layout there) — used below to stack the header/footer and
// go full-bleed on a phone-width viewport. Feature/security icons are emoji
// (guaranteed to render everywhere, no extra requests, no
// image-blocking-by-default issue). The header logo is the real
// public/images/logo_schoolapp360.png, embedded (not linked) via a
// Content-ID attachment — see lib/teachers.js's sendPasswordSetEmail — so it
// still renders when this app is only reachable at localhost.
export const LOGO_CID = 'schoolapp360-logo';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function passwordSetupEmailHtml({ firstName, link, isReset = false }) {
  const name = escapeHtml(firstName);
  const eyebrow = isReset ? 'PASSWORD RESET REQUEST' : 'WELCOME TO SCHOOLAPP 360';
  const heading = isReset ? 'Reset your password' : 'Set up your teacher account';
  const buttonLabel = isReset ? 'Reset Your Password' : 'Set Your Password';
  const intro = isReset
    ? `A password reset was requested for your SchoolApp 360 account. Click below to set a new password. This link is <strong>valid for 7 days</strong>.`
    : `Your school has added you as a teacher on SchoolApp 360. Set your password below to sign in and get access to your classes — mark attendance, share homework, post notices, and track your students, all from one place. This link is <strong>valid for 7 days</strong>.`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  @media only screen and (max-width: 480px) {
    .ea-outer { padding: 20px 12px !important; }
    .ea-card { padding: 28px 20px !important; border-radius: 14px !important; }
    .ea-heading { font-size: 22px !important; }
    .ea-tagline { display: none !important; }
    .ea-cta-cell { display: block !important; width: 100% !important; }
    .ea-cta-link { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
    .ea-footer-col { display: block !important; width: 100% !important; text-align: left !important; padding: 0 0 12px !important; }
    .ea-logo { width: 150px !important; height: auto !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#eef2ff;">
<div class="ea-outer" style="background-color:#eef2ff;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" style="max-width:600px;margin:0 auto;border-collapse:collapse;">
    <tr>
      <td style="padding-bottom:24px;">
        <table role="presentation" width="100%">
          <tr>
            <td style="vertical-align:middle;">
              <img
                src="cid:${LOGO_CID}"
                width="190"
                height="66"
                alt="SchoolApp 360"
                class="ea-logo"
                style="display:block;width:190px;height:auto;max-width:100%;border:0;"
              />
            </td>
            <td class="ea-tagline" style="text-align:right;font-size:12px;color:#64748b;line-height:1.5;vertical-align:middle;">
              Smarter Schools<br />Brighter Futures
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td class="ea-card" style="background-color:#ffffff;border-radius:20px;padding:40px 32px;">
        <p style="margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:1.5px;color:#2563eb;">${eyebrow}</p>
        <h1 class="ea-heading" style="margin:0 0 20px;font-size:28px;line-height:1.25;color:#0f172a;">${heading}</h1>
        <p style="margin:0 0 8px;font-size:15px;color:#334155;">Hi ${name},</p>
        <p style="margin:0;font-size:15px;color:#475569;line-height:1.6;">${intro}</p>

        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 0;">
          <tr>
            <td class="ea-cta-cell" style="background-color:#2563eb;border-radius:10px;">
              <a href="${link}" class="ea-cta-link" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">${buttonLabel}</a>
            </td>
          </tr>
        </table>

        <p style="margin:24px 0 8px;font-size:13px;color:#64748b;">Or copy and paste this link in your browser:</p>
        <table role="presentation" width="100%" style="background-color:#f8fafc;border-radius:10px;">
          <tr>
            <td style="padding:14px 16px;font-size:13px;color:#2563eb;word-break:break-all;">${link}</td>
          </tr>
        </table>

        <table role="presentation" width="100%" style="margin-top:28px;border-top:1px solid #e2e8f0;padding-top:20px;">
          <tr>
            <td class="ea-footer-col" style="font-size:12px;color:#64748b;line-height:1.6;">
              <strong style="color:#0f172a;">Need help?</strong><br />
              Contact your school administrator or reach us at
              <a href="mailto:support@schoolapp360.com" style="color:#2563eb;">support@schoolapp360.com</a>
            </td>
            <td class="ea-footer-col" style="text-align:right;font-size:12px;color:#64748b;line-height:1.6;">
              <strong style="color:#0f172a;">SchoolApp 360</strong><br />
              Smarter Schools. Brighter Futures.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>
</body>
</html>`;
}
