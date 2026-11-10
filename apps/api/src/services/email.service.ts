import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

export interface SendMailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  isNonEssential?: boolean;
  unsubscribeUrl?: string;
}

export interface EmailDispatchResult {
  success: boolean;
  messageId: string;
  provider: string;
}

export interface SentEmailRecord {
  id: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  headers: Record<string, string>;
  sentAt: string;
  provider: string;
}

export class EmailService {
  private provider: string;
  private from: string;
  public sentEmails: SentEmailRecord[] = [];

  constructor() {
    this.provider = env.EMAIL_PROVIDER || "MOCK";
    this.from = env.EMAIL_FROM || "ByteHUB Admissions <admissions@bytehub.dev>";
  }

  async sendMail(params: SendMailParams): Promise<EmailDispatchResult> {
    const {
      to,
      subject,
      html,
      text,
      isNonEssential = false,
      unsubscribeUrl = "",
    } = params;

    if (!to || !subject || !html) {
      throw new Error(
        "Missing required email fields: to, subject, and html are required."
      );
    }

    const headers: Record<string, string> = {};
    if (isNonEssential && unsubscribeUrl) {
      headers["List-Unsubscribe"] = `<${unsubscribeUrl}>`;
      headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
    }

    const emailRecord: SentEmailRecord = {
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

    const hasRealResendKey =
      !!env.RESEND_API_KEY && !/mock|placeholder/i.test(env.RESEND_API_KEY);

    if (this.provider === "RESEND" && hasRealResendKey) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: this.from,
            to: [to],
            subject,
            html,
            ...(text ? { text } : {}),
            headers,
          }),
        });

        if (!response.ok) {
          const errBody = await response.text();
          logger.error({ errBody }, "Failed to send email via Resend API");
          throw new Error(`Resend API error: ${response.statusText}`);
        }

        const data = (await response.json()) as { id?: string };
        return { success: true, messageId: data.id || "", provider: "RESEND" };
      } catch (err) {
        logger.error({ err }, "Resend dispatch failed, falling back to queued retry");
        throw err;
      }
    }

    // Default development / test mock
    this.sentEmails.push(emailRecord);
    logger.info(
      { to, subject, messageId: emailRecord.id },
      "Dispatched transactional email (Mock)"
    );

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
