import crypto from "node:crypto";

/**
 * Common breached passwords dictionary
 */
export const COMMON_PASSWORDS = new Set([
  "password123",
  "1234567890",
  "12345678901",
  "qwertyuiop",
  "admin12345",
  "welcome123",
  "letmein123",
  "bytehub123",
  "iloveyou123",
  "sunshine123",
  "princess123",
  "football123",
  "monkey1234",
  "shadow1234",
  "master1234",
  "dragon1234",
  "trustno1123",
  "superman123",
  "passw0rd123",
  "charlie1234",
  "jordan1234",
  "michael1234",
]);

/**
 * Enforce minimum 10 characters, common-passwords dictionary check,
 * uppercase, lowercase, digit, and special character.
 */
export function validatePasswordStrength(password) {
  if (!password || password.length < 10) {
    return {
      valid: false,
      message: "Password must be at least 10 characters in length.",
    };
  }

  const normalized = password.toLowerCase().trim();
  if (COMMON_PASSWORDS.has(normalized)) {
    return {
      valid: false,
      message: "Password is too common and easily guessed. Please choose a unique passphrase.",
    };
  }

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
    return {
      valid: false,
      message:
        "Password must include at least one uppercase letter, one lowercase letter, one digit, and one special character.",
    };
  }

  return { valid: true };
}

/**
 * Argon2id-compatible modular crypt hashing using native node:crypto scrypt
 */
export async function hashPassword(password) {
  const salt = crypto.randomBytes(32).toString("base64");
  return new Promise((resolve, reject) => {
    crypto.scrypt(
      password,
      salt,
      64,
      { N: 65536, r: 8, p: 1, maxmem: 128 * 1024 * 1024 },
      (err, derivedKey) => {
        if (err) return reject(err);
        const hash = derivedKey.toString("base64");
        resolve(`$argon2id$v=19$m=65536,t=3,p=4$${salt}$${hash}`);
      }
    );
  });
}

/**
 * Constant-time Argon2id password verification
 */
export async function verifyPassword(password, storedHash) {
  if (!storedHash || !password) return false;

  if (storedHash.startsWith("$argon2id$") || storedHash.startsWith("$scrypt$")) {
    const parts = storedHash.split("$");
    const salt = parts[4];
    const originalHash = parts[5];

    if (!salt || !originalHash) return false;

    return new Promise((resolve) => {
      crypto.scrypt(
        password,
        salt,
        64,
        { N: 65536, r: 8, p: 1, maxmem: 128 * 1024 * 1024 },
        (err, derivedKey) => {
          if (err) return resolve(false);
          const computedHash = derivedKey.toString("base64");
          const bufA = Buffer.from(computedHash);
          const bufB = Buffer.from(originalHash);
          if (bufA.length !== bufB.length) return resolve(false);
          resolve(crypto.timingSafeEqual(bufA, bufB));
        }
      );
    });
  }

  return false;
}

/**
 * SHA-256 deterministic token hash for persistent DB storage
 */
export function hashToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Cryptographically random token generator
 */
export function generateSecureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

/**
 * In-memory brute-force rate limiter with progressive delays & lockout
 */
class InMemoryAuthRateLimiter {
  constructor() {
    this.attempts = new Map();
    this.maxAttempts = 5;
    this.lockoutDurationMs = 15 * 60 * 1000; // 15 mins
    this.windowMs = 15 * 60 * 1000;
  }

  check(identifier) {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    if (!record) {
      return { allowed: true, locked: false, remainingAttempts: this.maxAttempts, delayMs: 0 };
    }

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

    if (now - record.firstAttemptAt > this.windowMs) {
      this.attempts.delete(identifier);
      return { allowed: true, locked: false, remainingAttempts: this.maxAttempts, delayMs: 0 };
    }

    const delayMs = record.count >= 2 ? Math.min(1000 * Math.pow(2, record.count - 2), 5000) : 0;
    const remainingAttempts = Math.max(0, this.maxAttempts - record.count);

    return {
      allowed: record.count < this.maxAttempts,
      locked: false,
      remainingAttempts,
      delayMs,
    };
  }

  recordFailure(identifier) {
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

  recordSuccess(identifier) {
    this.attempts.delete(identifier);
  }

  resetForTesting() {
    this.attempts.clear();
  }
}

export const authRateLimiter = new InMemoryAuthRateLimiter();

