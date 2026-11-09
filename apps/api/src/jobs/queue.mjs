import { EventEmitter } from "node:events";

export const JobTypes = Object.freeze({
  SEND_EMAIL: "SEND_EMAIL",
  EXPIRE_RESERVATIONS: "EXPIRE_RESERVATIONS",
  NIGHTLY_RECONCILIATION: "NIGHTLY_RECONCILIATION",
  GENERATE_CERTIFICATE: "GENERATE_CERTIFICATE",
  DATA_RETENTION_CLEANUP: "DATA_RETENTION_CLEANUP",
});

/**
 * Resilient Job Queue with Exponential Backoff, DLQ, and BullMQ Interface.
 */
export class ByteHubJobQueue extends EventEmitter {
  constructor(options = {}) {
    super();
    this.name = options.name || "bytehub-main-queue";
    this.maxAttempts = options.maxAttempts || 3;
    this.activeJobs = new Map();
    this.deadLetterQueue = new Map();
    this.completedJobs = [];
    this.handlers = new Map();
    this.isProcessing = false;
  }

  registerHandler(jobType, handlerFn) {
    this.handlers.set(jobType, handlerFn);
  }

  async add(name, data, opts = {}) {
    const jobId = opts.jobId || `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const job = {
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
    this.emit("waiting", job);

    // Trigger process tick
    setImmediate(() => this.processNext());
    return job;
  }

  async processNext() {
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
        } catch (err) {
          if (job.attemptsMade < job.maxAttempts) {
            // Exponential backoff delay
            job.status = "WAITING";
            const delay = job.backoff.delay * Math.pow(2, job.attemptsMade - 1);
            job.nextAttemptAt = Date.now() + delay;
            this.emit("failed_attempt", job, err);
          } else {
            // Exhausted all retries -> Route to Dead Letter Queue (DLQ)
            job.status = "FAILED";
            this.moveToDLQ(job, err);
          }
        }
      }
    }

    this.isProcessing = false;
  }

  moveToDLQ(job, err) {
    this.activeJobs.delete(job.id);
    const dlqRecord = {
      ...job,
      failedAt: new Date().toISOString(),
      failedReason: err.message || "Unknown error",
      stacktrace: err.stack ? [err.stack] : [],
    };
    this.deadLetterQueue.set(job.id, dlqRecord);
    this.emit("failed_dlq", dlqRecord);
  }

  getFailedJobs() {
    return Array.from(this.deadLetterQueue.values());
  }

  async retryJob(jobId) {
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

  getStats() {
    return {
      activeCount: this.activeJobs.size,
      completedCount: this.completedJobs.length,
      failedDlqCount: this.deadLetterQueue.size,
    };
  }
}

export const jobQueue = new ByteHubJobQueue();
