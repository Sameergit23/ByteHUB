function baseLayout(
  title: string,
  contentHtml: string,
  isNonEssential = false,
  unsubscribeUrl = ""
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F5F2EA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #16150F; }
    table { border-collapse: collapse; }
    .email-container { max-width: 600px; margin: 0 auto; background-color: #FAF8F3; border: 1px solid #D8D3C4; }
    .header { padding: 32px 32px 24px; border-bottom: 1px solid #D8D3C4; background-color: #F5F2EA; }
    .brand { font-size: 20px; font-weight: bold; letter-spacing: -0.5px; color: #16150F; text-decoration: none; }
    .tagline { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #5A574D; margin-top: 4px; font-family: monospace; }
    .content { padding: 32px; font-size: 14px; line-height: 1.6; color: #16150F; }
    .btn { display: inline-block; padding: 12px 24px; background-color: #B8341A; color: #FFFFFF !important; font-size: 13px; font-weight: 600; text-decoration: none; text-transform: uppercase; letter-spacing: 0.5px; border-radius: 0; margin-top: 16px; margin-bottom: 16px; }
    .footer { padding: 24px 32px; border-top: 1px solid #D8D3C4; background-color: #F5F2EA; font-size: 11px; color: #5A574D; line-height: 1.5; font-family: monospace; }
    .notice { font-size: 12px; color: #5A574D; border-left: 2px solid #16150F; padding-left: 12px; margin-top: 16px; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; border-left: 0; border-right: 0; }
      .content, .header, .footer { padding: 20px !important; }
    }
  </style>
</head>
<body>
  <div style="background-color: #F5F2EA; padding: 24px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0">
            <tr>
              <td class="header">
                <a href="https://bytehub.dev" class="brand" style="text-decoration: none; font-weight: 800; font-size: 22px; letter-spacing: -0.5px;">
                  <span style="color: #0A1128;">Byte</span><span style="color: #2563EB;">HUB</span>
                </a>
                <div class="tagline" style="font-family: monospace; font-size: 10px; letter-spacing: 2.5px; color: #5A574D; margin-top: 4px;">TRAIN. INTERN. LAUNCH.</div>
              </td>
            </tr>
            <tr>
              <td class="content">
                ${contentHtml}
              </td>
            </tr>
            <tr>
              <td class="footer">
                <div>ByteHUB · Bangalore, India</div>
                <div style="margin-top: 4px;">admissions@bytehub.dev · Security & Integrity SLA</div>
                ${
                  isNonEssential && unsubscribeUrl
                    ? `<div style="margin-top: 12px; border-top: 1px solid #D8D3C4; padding-top: 8px;">
                        You received this marketing update because you opted into ByteHUB digests.
                        <a href="${unsubscribeUrl}" style="color: #B8341A; text-decoration: underline; margin-left: 4px;">Unsubscribe</a>
                       </div>`
                    : `<div style="margin-top: 8px; font-size: 10px; color: #5A574D;">
                        This is an essential transactional notification regarding your account or enrollment. It cannot be unsubscribed.
                       </div>`
                }
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

export function renderVerifyEmailHtml(name: string, verificationUrl: string): string {
  const content = `
    <h1 style="font-size: 22px; font-weight: bold; margin-top: 0; margin-bottom: 12px; letter-spacing: -0.5px;">Verify your email address</h1>
    <p>Hello ${name || "there"},</p>
    <p>Thank you for signing up for ByteHUB. Please click the button below to verify your email address and activate your student account:</p>
    <div style="margin: 24px 0;">
      <a href="${verificationUrl}" class="btn" target="_blank">Verify Email Address →</a>
    </div>
    <p class="notice">This link is valid for 24 hours. If you did not create a ByteHUB account, you can safely ignore this email.</p>
  `;
  return baseLayout("Verify your ByteHUB Email", content);
}

export function renderResetPasswordHtml(
  name: string,
  resetUrl: string,
  ipAddress?: string
): string {
  const content = `
    <h1 style="font-size: 22px; font-weight: bold; margin-top: 0; margin-bottom: 12px; letter-spacing: -0.5px;">Reset your password</h1>
    <p>Hello ${name || "there"},</p>
    <p>We received a request to reset the password for your ByteHUB account (Origin IP: <code>${ipAddress || "Unknown"}</code>).</p>
    <div style="margin: 24px 0;">
      <a href="${resetUrl}" class="btn" target="_blank">Set New Password →</a>
    </div>
    <p class="notice">This password reset link expires in 1 hour and can only be used once. If you did not request a password reset, please change your credentials immediately or contact security@bytehub.dev.</p>
  `;
  return baseLayout("Reset Your ByteHUB Password", content);
}

export function renderApplicationReceivedHtml(
  studentName: string,
  roleTitle: string,
  companyName: string,
  applicationId: string
): string {
  const content = `
    <h1 style="font-size: 22px; font-weight: bold; margin-top: 0; margin-bottom: 12px; letter-spacing: -0.5px;">Application submitted successfully</h1>
    <p>Hello ${studentName},</p>
    <p>Your application for <strong>${roleTitle}</strong> at <strong>${companyName}</strong> has been received and added to the hiring pipeline.</p>
    <div style="background-color: #F5F2EA; border: 1px solid #D8D3C4; padding: 16px; margin: 20px 0; font-family: monospace; font-size: 12px;">
      <div><strong>Application ID:</strong> ${applicationId}</div>
      <div style="margin-top: 4px;"><strong>Position:</strong> ${roleTitle}</div>
      <div style="margin-top: 4px;"><strong>Company:</strong> ${companyName}</div>
      <div style="margin-top: 4px;"><strong>Current Status:</strong> <span style="color: #16150F; font-weight: bold;">SUBMITTED</span></div>
    </div>
    <p>You can track updates and withdrawal options directly from your <a href="https://bytehub.dev/dashboard/student" style="color: #B8341A; font-weight: 600;">Student Dashboard</a>.</p>
  `;
  return baseLayout("Application Received - " + roleTitle, content);
}

export function renderStatusChangedHtml(
  studentName: string,
  roleTitle: string,
  companyName: string,
  newStatus: string
): string {
  const content = `
    <h1 style="font-size: 22px; font-weight: bold; margin-top: 0; margin-bottom: 12px; letter-spacing: -0.5px;">Application status update</h1>
    <p>Hello ${studentName},</p>
    <p>Your application for <strong>${roleTitle}</strong> at <strong>${companyName}</strong> has updated status:</p>
    <div style="background-color: #F5F2EA; border: 1px solid #D8D3C4; padding: 16px; margin: 20px 0; font-family: monospace; font-size: 13px;">
      <strong>Updated Status:</strong> <span style="color: #B8341A; font-weight: bold;">${newStatus}</span>
    </div>
    <div style="margin: 20px 0;">
      <a href="https://bytehub.dev/dashboard/student" class="btn" target="_blank">View in Student Dashboard →</a>
    </div>
  `;
  return baseLayout("Application Status: " + newStatus, content);
}

export function renderPaymentReceiptHtml(
  studentName: string,
  programmeTitle: string,
  cohortCode: string,
  orderId: string,
  amountFormatted: string
): string {
  const content = `
    <h1 style="font-size: 22px; font-weight: bold; margin-top: 0; margin-bottom: 12px; letter-spacing: -0.5px;">Payment receipt & tax confirmation</h1>
    <p>Hello ${studentName},</p>
    <p>Your payment for <strong>${programmeTitle}</strong> has been confirmed via cryptographically signed webhook capture.</p>
    <div style="background-color: #F5F2EA; border: 1px solid #D8D3C4; padding: 16px; margin: 20px 0; font-family: monospace; font-size: 12px; line-height: 1.8;">
      <div><strong>Order ID:</strong> ${orderId}</div>
      <div><strong>Programme:</strong> ${programmeTitle}</div>
      <div><strong>Cohort:</strong> ${cohortCode}</div>
      <div><strong>Amount Paid:</strong> <span style="color: #B8341A; font-weight: bold;">${amountFormatted}</span></div>
      <div><strong>Status:</strong> PAID / SEAT ACTIVE</div>
    </div>
    <p class="notice">Official Receipt / Bill of Supply — GST Exempt (Turnover below statutory threshold under Section 22 of the CGST Act, 2017).</p>
    <div style="margin: 20px 0;">
      <a href="https://bytehub.dev/api/payments/${orderId}/invoice" class="btn" target="_blank">Download Payment Receipt (PDF) →</a>
    </div>
  `;
  return baseLayout("Payment Receipt: " + orderId, content);
}

export function renderEnrolmentConfirmedHtml(
  studentName: string,
  programmeTitle: string,
  cohortCode: string,
  startDateStr: string,
  mode: string
): string {
  const content = `
    <h1 style="font-size: 22px; font-weight: bold; margin-top: 0; margin-bottom: 12px; letter-spacing: -0.5px;">Welcome to ${programmeTitle}!</h1>
    <p>Hello ${studentName},</p>
    <p>Your seat in <strong>${cohortCode}</strong> is officially locked and confirmed.</p>
    <div style="background-color: #F5F2EA; border: 1px solid #D8D3C4; padding: 16px; margin: 20px 0; font-family: monospace; font-size: 12px; line-height: 1.8;">
      <div><strong>Start Date:</strong> ${startDateStr}</div>
      <div><strong>Delivery Mode:</strong> ${mode}</div>
      <div><strong>Curriculum Access:</strong> Unlocked in Student Dashboard</div>
    </div>
    <div style="margin: 24px 0;">
      <a href="https://bytehub.dev/dashboard/student" class="btn" target="_blank">Go to Student Dashboard →</a>
    </div>
  `;
  return baseLayout("Enrolment Confirmed - " + programmeTitle, content);
}

export function renderMarketingDigestHtml(
  studentName: string,
  unsubscribeUrl: string
): string {
  const content = `
    <h1 style="font-size: 22px; font-weight: bold; margin-top: 0; margin-bottom: 12px; letter-spacing: -0.5px;">Weekly Tech Internship Digest</h1>
    <p>Hello ${studentName},</p>
    <p>Here are newly published and verified tech internships open for applications this week on ByteHUB:</p>
    <ul>
      <li><strong>Frontend Developer Intern</strong> — Acme Cloud (Remote · ₹35,000 / mo)</li>
      <li><strong>Systems & Distributed Intern</strong> — HyperGrid Labs (On-site · ₹45,000 / mo)</li>
    </ul>
    <div style="margin: 20px 0;">
      <a href="https://bytehub.dev/internships" class="btn" target="_blank">Browse All Openings →</a>
    </div>
  `;
  return baseLayout("Weekly Internship Digest", content, true, unsubscribeUrl);
}
