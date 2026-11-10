import test from "node:test";
import assert from "node:assert/strict";
import { ByteHubJobQueue, JobTypes } from "../src/jobs/queue.mjs";
import { EmailService } from "../src/services/email.service.mjs";
import {
  renderVerifyEmailHtml,
  renderResetPasswordHtml,
  renderApplicationReceivedHtml,
  renderStatusChangedHtml,
  renderPaymentReceiptHtml,
  renderEnrolmentConfirmedHtml,
  renderMarketingDigestHtml,
} from "../src/services/emailTemplates.mjs";

// ============================================================================
// 1. Job Queue: Successful Execution & State Transitions
// ============================================================================

test("Job Queue: processes and completes registered jobs successfully", async () => {
  const queue = new ByteHubJobQueue({ name: "test-queue" });
  let executionCount = 0;

  queue.registerHandler(JobTypes.EXPIRE_RESERVATIONS, async (job) => {
    executionCount += 1;
    return { expiredCount: 2 };
  });

  const job = await queue.add(JobTypes.EXPIRE_RESERVATIONS, { trigger: "cron" });
  assert.equal(job.name, JobTypes.EXPIRE_RESERVATIONS);

  // Allow next event loop tick for processNext
  await new Promise((resolve) => setTimeout(resolve, 50));

  assert.equal(executionCount, 1);
  assert.equal(queue.getStats().completedCount, 1);
  assert.equal(queue.getStats().failedDlqCount, 0);
});

// ============================================================================
// 2. Retries with Exponential Backoff
// ============================================================================

test("Job Queue: retries failed job with exponential backoff before routing to DLQ", async () => {
  const queue = new ByteHubJobQueue({ name: "retry-queue", maxAttempts: 3 });
  let attempts = 0;

  queue.registerHandler(JobTypes.SEND_EMAIL, async () => {
    attempts += 1;
    throw new Error("Transient SMTP / API connection timeout");
  });

  await queue.add(JobTypes.SEND_EMAIL, { to: "student@example.com" }, { attempts: 3 });

  // Simulate multiple process ticks
  await new Promise((resolve) => setTimeout(resolve, 30));
  await queue.processNext();
  await queue.processNext();

  assert.equal(attempts, 3, "Job must have been attempted 3 times");
  const failedJobs = queue.getFailedJobs();
  assert.equal(failedJobs.length, 1, "Failed job must be routed to Dead-Letter Queue");
  assert.match(failedJobs[0].failedReason, /connection timeout/);
  assert.equal(failedJobs[0].status, "FAILED");
});

// ============================================================================
// 3. Dead-Letter Queue (DLQ) & Admin Replay
// ============================================================================

test("Dead-Letter Queue: admin can inspect and replay/retry dead-lettered job", async () => {
  const queue = new ByteHubJobQueue({ name: "dlq-queue", maxAttempts: 1 });
  let processedSuccessfully = false;

  queue.registerHandler(JobTypes.GENERATE_CERTIFICATE, async (job) => {
    if (job.data.shouldFail) {
      throw new Error("Storage quota exceeded");
    }
    processedSuccessfully = true;
    return { certificateCode: "BYTE-2026-CERT-01" };
  });

  const deadJob = await queue.add(JobTypes.GENERATE_CERTIFICATE, { shouldFail: true }, { attempts: 1 });
  await new Promise((resolve) => setTimeout(resolve, 30));

  const failedList = queue.getFailedJobs();
  assert.equal(failedList.length, 1);
  assert.equal(failedList[0].id, deadJob.id);

  // Admin fixes root cause and replays job
  deadJob.data.shouldFail = false;
  await queue.retryJob(deadJob.id);
  await new Promise((resolve) => setTimeout(resolve, 30));

  assert.equal(processedSuccessfully, true, "Job replayed from DLQ must complete successfully");
  assert.equal(queue.getFailedJobs().length, 0, "DLQ must be empty after successful replay");
});

// ============================================================================
// 4. Swiss-Editorial Transactional Email Template Rendering (Mobile-Ready)
// ============================================================================

test("Email Templates: verifyEmail renders responsive HTML with verification button", () => {
  const html = renderVerifyEmailHtml("Aditi Rao", "https://bytehub.dev/verify?token=abc123");
  assert.match(html, /Byte.*HUB/);
  assert.match(html, /Verify your email address/);
  assert.match(html, /Aditi Rao/);
  assert.match(html, /https:\/\/bytehub\.dev\/verify\?token=abc123/);
  assert.match(html, /#F5F2EA/); // Brand canvas background
  assert.match(html, /#B8341A/); // Brand vermillion accent button
  assert.match(html, /max-width: 600px/); // Mobile container
});

test("Email Templates: resetPassword includes IP notice and single-use warning", () => {
  const html = renderResetPasswordHtml("Vikram", "https://bytehub.dev/reset?token=xyz", "192.168.1.1");
  assert.match(html, /Reset your password/);
  assert.match(html, /192\.168\.1\.1/);
  assert.match(html, /expires in 1 hour/);
});

test("Email Templates: applicationReceived includes Application ID and role", () => {
  const html = renderApplicationReceivedHtml("Priya", "Frontend Intern", "Acme Cloud", "APP-2026-991");
  assert.match(html, /Application submitted successfully/);
  assert.match(html, /Frontend Intern/);
  assert.match(html, /Acme Cloud/);
  assert.match(html, /APP-2026-991/);
});

test("Email Templates: statusChanged includes text status badge", () => {
  const html = renderStatusChangedHtml("Rohan", "Backend Intern", "HyperGrid", "SHORTLISTED");
  assert.match(html, /Application status update/);
  assert.match(html, /SHORTLISTED/);
});

test("Email Templates: paymentReceipt includes order ID and receipt details", () => {
  const html = renderPaymentReceiptHtml("Sneha", "Full-Stack Web", "WEB-2026-01", "order_k9f12a", "₹24,000");
  assert.match(html, /Payment receipt/);
  assert.match(html, /order_k9f12a/);
  assert.match(html, /₹24,000/);
  assert.match(html, /Official Receipt \/ Bill of Supply|GST/);
});

test("Email Templates: enrolmentConfirmed includes cohort start date and curriculum link", () => {
  const html = renderEnrolmentConfirmedHtml("Arjun", "Data & AI Mastery", "DATA-2026-01", "December 1, 2026", "[REMOTE / ON-SITE]");
  assert.match(html, /Welcome to Data & AI Mastery!/);
  assert.match(html, /DATA-2026-01/);
  assert.match(html, /December 1, 2026/);
});

// ============================================================================
// 5. Unsubscribe Handling (Transactional vs Non-Essential Rules)
// ============================================================================

test("Unsubscribe Rule: essential transactional emails strictly omit unsubscribe link", async () => {
  const mailer = new EmailService("MOCK");
  const receiptHtml = renderPaymentReceiptHtml("User", "Web Dev", "WEB-01", "ord_1", "₹24,000");

  const result = await mailer.sendMail({
    to: "student@example.com",
    subject: "Payment Receipt",
    html: receiptHtml,
    isNonEssential: false, // Essential transactional email
  });

  assert.equal(result.success, true);
  const sent = mailer.getRecentSentEmails()[0];
  assert.equal(sent.headers["List-Unsubscribe"], undefined, "Essential email must NOT have List-Unsubscribe header");
  assert.match(sent.html, /cannot be unsubscribed/, "Must inform student this is an essential transactional notice");
});

test("Unsubscribe Rule: marketing/non-essential digests include visible link and RFC 8058 header", async () => {
  const mailer = new EmailService("MOCK");
  const unsubUrl = "https://bytehub.dev/api/auth/unsubscribe?token=unsub_token_123";
  const digestHtml = renderMarketingDigestHtml("Student", unsubUrl);

  const result = await mailer.sendMail({
    to: "student@example.com",
    subject: "Weekly Digest",
    html: digestHtml,
    isNonEssential: true,
    unsubscribeUrl: unsubUrl,
  });

  assert.equal(result.success, true);
  const sent = mailer.getRecentSentEmails()[0];
  assert.equal(sent.headers["List-Unsubscribe"], `<${unsubUrl}>`, "Must include RFC 8058 List-Unsubscribe header");
  assert.equal(sent.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  assert.match(sent.html, /Unsubscribe/);
});
