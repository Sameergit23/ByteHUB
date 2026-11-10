/**
 * ByteHUB API client.
 *
 * In the browser every call goes to the same-origin "/api" path, which Next.js proxies to the
 * Express API (see next.config.mjs). Same-origin means the httpOnly session cookies and the
 * CSRF cookie just work, and the Next.js middleware can see the session too.
 *
 * On the server (SSR) there is no proxy in the way, so calls go straight to the API.
 */

const IS_SERVER = typeof window === "undefined";

export const SERVER_API_BASE = (
  process.env.API_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5001/api"
).replace(/\/$/, "");

const API_BASE = IS_SERVER ? SERVER_API_BASE : "/api";

const USER_KEY = "bytehub_user";
const REFRESHED_AT_KEY = "bytehub_refreshed_at";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Endpoints where a 401 means "wrong credentials", not "session expired".
const NO_REFRESH_RETRY =
  /^\/auth\/(login|register|refresh|logout|forgot-password|reset-password|verify-email)/;

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: "STUDENT" | "COMPANY" | "ADMIN";
  organizationName?: string | null;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  data?: unknown;

  constructor(message: string, status: number, code?: string, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

/** A readable message from anything thrown, with a fallback for non-Error values. */
export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

/** Response envelope used by the ByteHUB API. */
export interface ApiEnvelope<T> {
  status?: string;
  message?: string;
  data: T;
}

// ---------------------------------------------------------------------------
// Signed-in user (display info only — the session itself lives in httpOnly cookies)
// ---------------------------------------------------------------------------

export function getStoredUser(): StoredUser | null {
  if (IS_SERVER) return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredUser(user: StoredUser): void {
  if (IS_SERVER) return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(REFRESHED_AT_KEY, String(Date.now()));
}

export function clearAuth(): void {
  if (IS_SERVER) return;
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(REFRESHED_AT_KEY);
  localStorage.removeItem("bytehub_token"); // legacy key from before cookie sessions
}

export const clearAuthToken = clearAuth;

// ---------------------------------------------------------------------------
// CSRF (double-submit cookie)
// ---------------------------------------------------------------------------

function readCookie(name: string): string | null {
  if (IS_SERVER) return null;
  const match = document.cookie.split("; ").find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

async function ensureCsrfToken(): Promise<string | null> {
  let token = readCookie("bh_csrf_token");
  if (!token) {
    // Any safe request makes the API issue the CSRF cookie.
    await fetch(`${API_BASE}/health`, { credentials: "include" }).catch(() => null);
    token = readCookie("bh_csrf_token");
  }
  return token;
}

// ---------------------------------------------------------------------------
// Session refresh (rotating refresh token)
// ---------------------------------------------------------------------------

let refreshInFlight: Promise<boolean> | null = null;

async function runRefresh(): Promise<boolean> {
  // Another tab may have rotated the token a moment ago; its new cookies are already ours.
  const last = Number(localStorage.getItem(REFRESHED_AT_KEY) || 0);
  if (Date.now() - last < 20_000) return true;

  const csrf = await ensureCsrfToken();
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
    },
    body: "{}",
  }).catch(() => null);

  if (!res || !res.ok) return false;

  const data = await res.json().catch(() => null);
  if (data?.data?.user) {
    setStoredUser(data.data.user);
  } else {
    localStorage.setItem(REFRESHED_AT_KEY, String(Date.now()));
  }
  return true;
}

/**
 * Renews the session using the refresh cookie. Safe to call from several places and tabs at
 * once: refresh tokens are single-use, so calls are serialised (one per browser at a time).
 */
export function refreshSession(): Promise<boolean> {
  if (IS_SERVER) return Promise.resolve(false);

  if (!refreshInFlight) {
    const locks = (navigator as Navigator & { locks?: LockManager }).locks;
    const task: Promise<boolean> = locks?.request
      ? Promise.resolve(locks.request("bytehub-session-refresh", () => runRefresh()))
      : runRefresh();

    refreshInFlight = task
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

/** Sends the visitor to the sign-in page and brings them back afterwards. */
export function redirectToLogin(returnTo?: string): void {
  if (IS_SERVER) return;
  const target = returnTo || `${window.location.pathname}${window.location.search}`;
  window.location.assign(`/auth?mode=login&redirect=${encodeURIComponent(target)}`);
}

export async function logout(): Promise<void> {
  try {
    await apiFetch("/auth/logout", { method: "POST", body: "{}" });
  } catch {
    // The local session is cleared regardless.
  } finally {
    clearAuth();
  }
}

// ---------------------------------------------------------------------------
// Fetch wrapper
// ---------------------------------------------------------------------------

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const headers: Record<string, string> = {
    ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...(options.headers as Record<string, string>),
  };

  if (!IS_SERVER && !SAFE_METHODS.has(method)) {
    const csrf = await ensureCsrfToken();
    if (csrf) headers["X-CSRF-Token"] = csrf;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      credentials: "include",
    });
  } catch {
    throw new ApiError(
      "Could not reach the ByteHUB server. Check your connection and try again.",
      0,
      "NETWORK_ERROR"
    );
  }

  // Access tokens last 15 minutes: renew once, then replay the request.
  if (res.status === 401 && !IS_SERVER && !isRetry && !NO_REFRESH_RETRY.test(endpoint)) {
    const renewed = await refreshSession();
    if (renewed) {
      return apiFetch<T>(endpoint, options, true);
    }
    clearAuth();
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      data?.error?.message || data?.message || `Request failed (HTTP ${res.status})`;
    throw new ApiError(message, res.status, data?.error?.code, data);
  }

  return data as T;
}
