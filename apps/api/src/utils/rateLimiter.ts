export interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
  lastAttemptAt: number;
  lockedUntil: number | null;
}

class InMemoryAuthRateLimiter {
  private attempts = new Map<string, AttemptRecord>();
  private readonly maxAttempts = 5;
  private readonly lockoutDurationMs = 15 * 60 * 1000; // 15 minutes
  private readonly windowMs = 15 * 60 * 1000;

  private cleanup() {
    const now = Date.now();
    for (const [key, record] of this.attempts.entries()) {
      if (record.lockedUntil && record.lockedUntil < now) {
        this.attempts.delete(key);
      } else if (now - record.firstAttemptAt > this.windowMs && !record.lockedUntil) {
        this.attempts.delete(key);
      }
    }
  }

  public check(identifier: string): {
    allowed: boolean;
    locked: boolean;
    remainingAttempts: number;
    lockoutExpiresInSeconds?: number;
    delayMs: number;
  } {
    this.cleanup();
    const now = Date.now();
    const record = this.attempts.get(identifier);

    if (!record) {
      return { allowed: true, locked: false, remainingAttempts: this.maxAttempts, delayMs: 0 };
    }

    // Check if locked
    if (record.lockedUntil && record.lockedUntil > now) {
      const remainingSec = Math.ceil((record.lockedUntil - now) / 1000);
      return {
        allowed: false,
        locked: true,
        remainingAttempts: 0,
        lockoutExpiresInSeconds: remainingSec,
        delayMs: 0,
      };
    }

    // Reset if window passed
    if (now - record.firstAttemptAt > this.windowMs) {
      this.attempts.delete(identifier);
      return { allowed: true, locked: false, remainingAttempts: this.maxAttempts, delayMs: 0 };
    }

    // Progressive delay calculation (1s, 2s, 4s...)
    const delayMs = record.count >= 2 ? Math.min(1000 * Math.pow(2, record.count - 2), 5000) : 0;
    const remainingAttempts = Math.max(0, this.maxAttempts - record.count);

    return {
      allowed: record.count < this.maxAttempts,
      locked: false,
      remainingAttempts,
      delayMs,
    };
  }

  public recordFailure(identifier: string): {
    locked: boolean;
    lockoutDurationSeconds?: number;
  } {
    const now = Date.now();
    let record = this.attempts.get(identifier);

    if (!record || now - record.firstAttemptAt > this.windowMs) {
      record = {
        count: 1,
        firstAttemptAt: now,
        lastAttemptAt: now,
        lockedUntil: null,
      };
      this.attempts.set(identifier, record);
      return { locked: false };
    }

    record.count += 1;
    record.lastAttemptAt = now;

    if (record.count >= this.maxAttempts) {
      record.lockedUntil = now + this.lockoutDurationMs;
      return {
        locked: true,
        lockoutDurationSeconds: Math.ceil(this.lockoutDurationMs / 1000),
      };
    }

    return { locked: false };
  }

  public recordSuccess(identifier: string): void {
    this.attempts.delete(identifier);
  }

  public resetForTesting(): void {
    this.attempts.clear();
  }
}

export const authRateLimiter = new InMemoryAuthRateLimiter();

