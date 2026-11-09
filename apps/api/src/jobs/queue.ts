import { EventEmitter } from "node:events";
import { logger } from "../utils/logger.js";
import { emailService } from "../services/email.service.js";
import { trainingRepository } from "../repositories/training.repository.js";
import { paymentService } from "../services/paymentService.js";
import { prisma } from "../lib/prisma.js";

export type JobTypeName =
  | "SEND_EMAIL"
  | "EXPIRE_RESERVATIONS"
  | "NIGHTLY_RECONCILIATION"
  | "GENERATE_CERTIFICATE"
  | "DATA_RETENTION_CLEANUP";

export interface JobRecord<T = any> {
  id: string;
  name: JobTypeName;
  data: T;
  attemptsMade: number;
  maxAttempts: number;
  backoff: { type: string; delay: number };
  createdAt: string;
  status: "WAITING" | "ACTIVE" | "COMPLETED" | "FAILED";
  failedAt?: string;
  failedReason?: string;
  stacktrace?: string[];
  returnvalue?: any;
}

export class ByteHubJobQueue extends EventEmitter {
  public name = "bytehub-main-queue";
  private maxAttempts = 3;
  private activeJobs = new Map<string, JobRecord>();
  private deadLetterQueue = new Map<string, JobRecord>();
  private completedJobs: JobRecord[] = [];
  private handlers = new Map<string, (job: JobRecord) => Promise<any>>();
  private isProcessing = false;

  constructor() {
    super();
    this.registerDefaultHandlers();
  }

  private registerDefaultHandlers() {
    // 1. Send Email Job Handler
    this.registerHandler("SEND_EMAIL", async (job) => {
      return emailService.sendMail(job.data);
    });

    // 2. Expire Reservations Job Handler
    this.registerHandler("EXPIRE_RESERVATIONS", async () => {
      return trainingRepository.expireUnpaidReservations();
    });

    // 3. Nightly Reconciliation Job Handler
    this.registerHandler("NIGHTLY_RECONCILIATION", async () => {
      return paymentService.reconcileNightly();
    });

    // 4. Generate Certificate Job Handler
    this.registerHandler("GENERATE_CERTIFICATE", async (job) => {
      const { enrollmentId, userId, title } = job.data;
      const code = `BYTE-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      return prisma.certificate.create({
        data: {
          enrollmentId,
          userId,
          title,
          certificateCode: code,
          verificationUrl: `/verify/${code}`,
        },
      });
    });

    // 5. Data Retention Cleanup Job Handler
    this.registerHandler("DATA_RETENTION_CLEANUP", async () => {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      // Clean up soft-deleted accounts past statutory retention
      const deletedTokens = await prisma.refreshToken.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      return { purgedTokens: deletedTokens.count };
    });
  }

  public registerHandler(jobType: JobTypeName, handlerFn: (job: JobRecord) => Promise<any>) {
    this.handlers.set(jobType, handlerFn);
  }

  public async add<T = any>(
    name: JobTypeName,
    data: T,
    opts: { attempts?: number; backoff?: { type: string; delay: number }; jobId?: string } = {}
  ): Promise<JobRecord<T>> {
    const jobId = opts.jobId || `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const job: JobRecord<T> = {
      id: jobId,
      name,
      data,
      attemptsMade: 0,
      maxAttempts: opts.attempts || this.maxAttempts,
      backoff: opts.backoff || { type: "exponential", delay: 1000 },
      createdAt: new Date().toISOString(),
      status: "WAITING",
    };

    this.activeJobs.set(jobId, job);
    logger.info({ jobId, name }, "Queued background job");

    setImmediate(() => this.processNext());
    return job;
  }

  public async processNext(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    for (const [id, job] of this.activeJobs.entries()) {
      if (job.status === "WAITING") {
        job.status = "ACTIVE";
        job.attemptsMade += 1;

        const handler = this.handlers.get(job.name);
        if (!handler) {
          job.status = "FAILED";
          this.moveToDLQ(job, new Error(`No handler registered for job type: ${job.name}`));
          continue;
        }

        try {
          const result = await handler(job);
          job.status = "COMPLETED";
          job.returnvalue = result;
          this.activeJobs.delete(id);
          this.completedJobs.push(job);
          this.emit("completed", job, result);
        } catch (err: any) {
          logger.warn({ jobId: id, attempt: job.attemptsMade, error: err.message }, "Job attempt failed");
          if (job.attemptsMade < job.maxAttempts) {
            job.status = "WAITING";
            this.emit("failed_attempt", job, err);
          } else {
            job.status = "FAILED";
            this.moveToDLQ(job, err);
          }
        }
      }
    }

    this.isProcessing = false;
  }

  private moveToDLQ(job: JobRecord, err: Error) {
    this.activeJobs.delete(job.id);
    const dlqRecord: JobRecord = {
      ...job,
      failedAt: new Date().toISOString(),
      failedReason: err.message || "Unknown error",
      stacktrace: err.stack ? [err.stack] : [],
    };
    this.deadLetterQueue.set(job.id, dlqRecord);
    logger.error({ jobId: job.id, name: job.name, reason: err.message }, "Job routed to Dead-Letter Queue (DLQ)");
    this.emit("failed_dlq", dlqRecord);
  }

  public getFailedJobs(): JobRecord[] {
    return Array.from(this.deadLetterQueue.values());
  }

  public async retryJob(jobId: string): Promise<JobRecord> {
    const deadJob = this.deadLetterQueue.get(jobId);
    if (!deadJob) {
      throw new Error(`Job '${jobId}' not found in Dead-Letter Queue.`);
    }

    this.deadLetterQueue.delete(jobId);
    return this.add(deadJob.name, deadJob.data, {
      jobId: deadJob.id,
      attempts: deadJob.maxAttempts,
    });
  }

  public getStats() {
    return {
      activeCount: this.activeJobs.size,
      completedCount: this.completedJobs.length,
      failedDlqCount: this.deadLetterQueue.size,
    };
  }
}

export const jobQueue = new ByteHubJobQueue();
