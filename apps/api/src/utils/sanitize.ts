/**
 * Masks an email address for privacy and security compliance.
 * e.g. "alex.miller@example.com" -> "a***r@example.com"
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "***";
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";

  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

/**
 * Redacts known sensitive fields recursively from arbitrary objects
 */
export function sanitizeLogData<T>(obj: T): T {
  if (!obj || typeof obj !== "object") return obj;

  const SENSITIVE_KEYS = new Set([
    "password",
    "passwordHash",
    "token",
    "accessToken",
    "refreshToken",
    "authorization",
    "cookie",
    "set-cookie",
    "cardNumber",
    "card",
    "cvv",
    "cvc",
    "secret",
    "keySecret",
  ]);

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeLogData(item)) as unknown as T;
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      sanitized[key] = "[REDACTED]";
    } else if (lowerKey === "email" && typeof value === "string") {
      sanitized[key] = maskEmail(value);
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeLogData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}
