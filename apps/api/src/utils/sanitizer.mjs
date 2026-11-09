/**
 * ByteHUB Input Sanitizer Utility
 * Sanitizes input strings by neutralizing HTML tags, scripts, and null bytes.
 */

export function sanitizeString(val) {
  if (typeof val !== "string") return val;

  return val
    .replace(/\0/g, "") // Null byte removal
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Script tag removal
    .trim();
}

/**
 * Deep sanitization of objects, arrays, and primitive strings
 */
export function sanitizeDeep(input) {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === "string") {
    return sanitizeString(input);
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeDeep(item));
  }

  if (typeof input === "object" && input.constructor === Object) {
    const sanitizedObj = {};
    for (const [key, value] of Object.entries(input)) {
      sanitizedObj[key] = sanitizeDeep(value);
    }
    return sanitizedObj;
  }

  return input;
}

