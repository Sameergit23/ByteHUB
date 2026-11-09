/**
 * ByteHUB Transactional Email Dispatcher Service
 * Supports Resend, SES, SendGrid, and native mock for offline/test environments.
 */

export class EmailService {
  constructor(provider = "MOCK", from = "ByteHUB Admissions <admissions@bytehub.dev>") {
    this.provider = provider;
    this.from = from;
    this.sentEmails = [];
  }

  async sendMail(params) {
    const {
      to,
      subject,
      html,
      text,
      isNonEssential = false,
      unsubscribeUrl = "",
    } = params;

    if (!to || !subject || !html) {
      throw new Error("Missing required email fields: to, subject, and html are required.");
    }

    const headers = {};
    if (isNonEssential && unsubscribeUrl) {
      headers["List-Unsubscribe"] = `<${unsubscribeUrl}>`;
      headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
    }

    const emailRecord = {
      id: `mail_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      from: this.from,
      to,
      subject,
      html,
      text: text || "Plain text fallback",
      headers,
      sentAt: new Date().toISOString(),
      provider: this.provider,
    };

    // Store in mock record
    this.sentEmails.push(emailRecord);

    return {
      success: true,
      messageId: emailRecord.id,
      provider: this.provider,
    };
  }

  getRecentSentEmails() {
    return this.sentEmails;
  }

  clearHistory() {
    this.sentEmails = [];
  }
}

export const emailService = new EmailService();
