const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("bytehub_token");
}

export function setAuthToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("bytehub_token", token);
  }
}

export function clearAuthToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("bytehub_token");
    localStorage.removeItem("bytehub_user");
  }
}

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: "STUDENT" | "COMPANY" | "ADMIN";
  organizationName?: string | null;
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("bytehub_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredUser(user: StoredUser): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("bytehub_user", JSON.stringify(user));
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const errorMsg = data?.message || `HTTP error ${res.status}`;
    const err = new Error(errorMsg);
    (err as any).status = res.status;
    (err as any).data = data;
    throw err;
  }

  return data;
}

