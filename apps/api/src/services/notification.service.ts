import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import type { SendMailParams } from "./email.service.js";
import {
  renderVerifyEmailHtml,
  renderResetPasswordHtml,
  renderApplicationReceivedHtml,
  renderStatusChangedHtml,
  renderPaymentReceiptHtml,
  renderEnrolmentConfirmedHtml,
} from "./emailTemplates.js";

/**
 * Transactional notifications.
 *
 * Every send goes through the background job queue (retries + dead-letter queue)
 * and never throws, so a mail outage cannot fail the request that triggered it.
 */

const isDevMailbox = (): boolean =>
  env.NODE_ENV !== "production" && env.EMAIL_PROVIDER === "MOCK";

async function enqueue(
  kind: string,
  params: SendMailParams,
  actionLink?: string
): Promise<void> {
  try {
    // Lazy import: the queue itself depends on services that send notifications.
    const { jobQueue } = await import("../jobs/queue.js");
    await jobQueue.add("SEND_EMAIL", params);

    // Without a real mail provider in development, surface the link so flows stay testable.
    if (actionLink && isDevMailbox()) {
      logger.info({ kind, to: params.to, actionLink }, "[DEV MAILBOX] Email action link");
    }
  } catch (err) {
    logger.error({ err, kind, to: params.to }, "Failed to queue transactional email");
  }
}

const frontendUrl = (path: string): string =>
  `${env.FRONTEND_URL.replace(/\/$/, "")}${path}`;

export function formatMoney(amountMinor: number, currency: string): string {
  const major = amountMinor / 100;
  if (currency.toUpperCase() === "INR") {
    return `₹${major.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  }
  return `${currency.toUpperCase()} ${major.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export const notificationService = {
  async sendVerificationEmail(user: { name: string; email: string }, rawToken: string) {
    const link = frontendUrl(`/verify-email?token=${encodeURIComponent(rawToken)}`);
    await enqueue(
      "VERIFY_EMAIL",
      {
        to: user.email,
        subject: "Verify your ByteHUB email address",
        html: renderVerifyEmailHtml(user.name, link),
        text: `Hi ${user.name},\n\nConfirm your email address to activate your ByteHUB account:\n${link}\n\nThis link expires in 24 hours.`,
      },
      link
    );
  },

  async sendPasswordResetEmail(
    user: { name: string; email: string },
    rawToken: string,
    ipAddress?: string
  ) {
    const link = frontendUrl(`/reset-password?token=${encodeURIComponent(rawToken)}`);
    await enqueue(
      "RESET_PASSWORD",
      {
        to: user.email,
        subject: "Reset your ByteHUB password",
        html: renderResetPasswordHtml(user.name, link, ipAddress),
        text: `Hi ${user.name},\n\nUse this single-use link to choose a new password:\n${link}\n\nIt expires in 1 hour. If you did not request this, you can ignore this email.`,
      },
      link
    );
  },

  async sendApplicationReceived(params: {
    studentName: string;
    studentEmail: string;
    roleTitle: string;
    companyName: string;
    applicationId: string;
  }) {
    await enqueue("APPLICATION_RECEIVED", {
      to: params.studentEmail,
      subject: `Application received: ${params.roleTitle} at ${params.companyName}`,
      html: renderApplicationReceivedHtml(
        params.studentName,
        params.roleTitle,
        params.companyName,
        params.applicationId
      ),
      text: `Hi ${params.studentName},\n\nWe received your application for ${params.roleTitle} at ${params.companyName}.\nApplication ID: ${params.applicationId}\n\nTrack it here: ${frontendUrl("/dashboard/student")}`,
    });
  },

  async sendApplicationStatusChanged(params: {
    studentName: string;
    studentEmail: string;
    roleTitle: string;
    companyName: string;
    newStatus: string;
  }) {
    const label = params.newStatus.replace(/_/g, " ");
    await enqueue("APPLICATION_STATUS_CHANGED", {
      to: params.studentEmail,
      subject: `Application update: ${params.roleTitle} — ${label}`,
      html: renderStatusChangedHtml(
        params.studentName,
        params.roleTitle,
        params.companyName,
        label
      ),
      text: `Hi ${params.studentName},\n\nYour application for ${params.roleTitle} at ${params.companyName} is now: ${label}.\n\nDetails: ${frontendUrl("/dashboard/student")}`,
    });
  },

  async sendPaymentConfirmed(params: {
    studentName: string;
    studentEmail: string;
    programmeTitle: string;
    cohortCode: string;
    orderId: string;
    amountMinor: number;
    currency: string;
    startDate?: Date | null;
    mode?: string | null;
  }) {
    const amount = formatMoney(params.amountMinor, params.currency);

    await enqueue("PAYMENT_RECEIPT", {
      to: params.studentEmail,
      subject: `Payment receipt: ${params.programmeTitle} (${params.orderId})`,
      html: renderPaymentReceiptHtml(
        params.studentName,
        params.programmeTitle,
        params.cohortCode,
        params.orderId,
        amount
      ),
      text: `Hi ${params.studentName},\n\nWe received your payment of ${amount} for ${params.programmeTitle} (${params.cohortCode}).\nOrder ID: ${params.orderId}\n\nDownload your receipt from ${frontendUrl("/dashboard/student")}`,
    });

    const startDateStr = params.startDate
      ? new Date(params.startDate).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "To be announced";

    await enqueue("ENROLMENT_CONFIRMED", {
      to: params.studentEmail,
      subject: `Enrolment confirmed: ${params.programmeTitle}`,
      html: renderEnrolmentConfirmedHtml(
        params.studentName,
        params.programmeTitle,
        params.cohortCode,
        startDateStr,
        params.mode || "Remote"
      ),
      text: `Hi ${params.studentName},\n\nYour seat in ${params.programmeTitle} (${params.cohortCode}) is confirmed.\nStart date: ${startDateStr}\n\nYour dashboard: ${frontendUrl("/dashboard/student")}`,
    });
  },
};
