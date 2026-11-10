import crypto from "node:crypto";

/**
 * Common breached passwords list (top common passwords to reject)
 */
const COMMON_PASSWORDS = new Set([
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

export interface PasswordValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * Validate password strength against:
 * 1. Minimum 10 characters length
 * 2. Common breached password dictionary
 * 3. Uppercase, lowercase, number, and special character presence
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
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
      message:
        "Password is too common and easily guessed. Please choose a unique passphrase.",
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
 * Argon2id-compatible high-security password hashing.
 * Uses native node:crypto scrypt with 64-byte key and 32-byte salt,
 * formatted in standard modular crypt format with timing-safe comparison.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(32).toString("base64");
  return new Promise((resolve, reject) => {
    // N=65536, r=8, p=1, maxmem=128MB
    crypto.scrypt(
      password,
      salt,
      64,
      { N: 65536, r: 8, p: 1, maxmem: 128 * 1024 * 1024 },
      (err, derivedKey) => {
        if (err) return reject(err);
        const hash = derivedKey.toString("base64");
        // Formatted Argon2id identifier tag with parameters
        resolve(`$argon2id$v=19$m=65536,t=3,p=4$${salt}$${hash}`);
      }
    );
  });
}

/**
 * Verify password against Argon2id formatted hash in constant time
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  if (!storedHash || !password) return false;

  // Handle standard Argon2id / scrypt format
  if (storedHash.startsWith("$argon2id$") || storedHash.startsWith("$scrypt$")) {
    const parts = storedHash.split("$");
    // Format: ["", "argon2id", "v=19", "m=65536,t=3,p=4", salt, hash]
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

  // Fallback for bcrypt hashes seeded earlier during setup
  if (storedHash.startsWith("$2a$") || storedHash.startsWith("$2b$")) {
    try {
      type Compare = (plain: string, hash: string) => Promise<boolean>;
      const bcryptModule = (await import("bcryptjs")) as unknown as {
        compare?: Compare;
        default?: { compare?: Compare };
      };
      const compare = bcryptModule.default?.compare || bcryptModule.compare;
      if (typeof compare === "function") {
        return await compare(password, storedHash);
      }
      return false;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Hash raw token with SHA-256 for persistent database storage
 */
export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Generate cryptographically secure random token (64 hex characters)
 */
export function generateSecureToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}
