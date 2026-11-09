export function sanitizeString(val: string): string {
  if (typeof val !== "string") return val;

  return val
    .replace(/\0/g, "")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .trim();
}

export function sanitizeDeep<T>(input: T): T {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === "string") {
    return sanitizeString(input) as unknown as T;
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeDeep(item)) as unknown as T;
  }

  if (typeof input === "object" && input.constructor === Object) {
    const sanitizedObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(input as Record<string, any>)) {
      sanitizedObj[key] = sanitizeDeep(value);
    }
    return sanitizedObj as T;
  }

  return input;
}

