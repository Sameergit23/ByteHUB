import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { SentryService } from "../config/sentry.js";

export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL";

export interface SystemAlertPayload {
  title: string;
  severity: AlertSeverity;
  event:
    | "PAYMENT_FAILURE"
    | "PAYMENT_REVIEW_REQUIRED"
    | "WEBHOOK_FORGERY"
    | "DLQ_JOB_FAILED"
    | "DB_DEGRADATION"
    | "IDOR_ATTEMPT";
  details: Record<string, unknown>;
  timestamp: string;
}

export class AlertService {
  /**
   * Dispatches alerts to external incident channels (PagerDuty, Slack, Sentry)
   */
  static async sendAlert(payload: Omit<SystemAlertPayload, "timestamp">): Promise<void> {
    const fullAlert: SystemAlertPayload = {
      ...payload,
      timestamp: new Date().toISOString(),
    };

    logger.warn({
      msg: `[ALERT TRIGGERED] [${fullAlert.severity}] ${fullAlert.title}`,
      event: fullAlert.event,
      details: fullAlert.details,
    });

    // Record breadcrumb or error in Sentry
    if (fullAlert.severity === "CRITICAL") {
      SentryService.captureException(new Error(`[CRITICAL ALERT] ${fullAlert.title}`), {
        event: fullAlert.event,
        ...fullAlert.details,
      });
    }

    if (!env.ALERT_WEBHOOK_URL) {
      return;
    }

    try {
      // Dispatch HTTPS POST to incident management webhook
      const response = await fetch(env.ALERT_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `*[ByteHUB ${env.NODE_ENV.toUpperCase()} ALERT]*\n*${fullAlert.severity}: ${fullAlert.title}*\n\`\`\`json\n${JSON.stringify(fullAlert.details, null, 2)}\n\`\`\``,
        }),
      });

      if (!response.ok) {
        logger.error({
          msg: "Failed to dispatch alert webhook",
          statusCode: response.status,
        });
      }
    } catch (err) {
      logger.error({ err, msg: "Error dispatching webhook notification" });
    }
  }

  static async notifyPaymentFailure(data: {
    orderId: string;
    provider: string;
    reason: string;
    amount?: number;
  }): Promise<void> {
    await this.sendAlert({
      title: `Payment Capture Failed on ${data.provider}`,
      severity: "CRITICAL",
      event: "PAYMENT_FAILURE",
      details: data,
    });
  }

  static async notifyWebhookForgery(data: {
    provider: string;
    ip?: string;
    receivedSignature: string;
  }): Promise<void> {
    await this.sendAlert({
      title: `Security: Webhook HMAC Signature Forgery Detected on ${data.provider}`,
      severity: "CRITICAL",
      event: "WEBHOOK_FORGERY",
      details: data,
    });
  }

  static async notifyDeadLetterQueueJob(data: {
    queue: string;
    jobId: string;
    error: string;
    attempts: number;
  }): Promise<void> {
    await this.sendAlert({
      title: `Background Job Exhausted Retries -> Routed to DLQ (${data.queue})`,
      severity: "WARNING",
      event: "DLQ_JOB_FAILED",
      details: data,
    });
  }
}
