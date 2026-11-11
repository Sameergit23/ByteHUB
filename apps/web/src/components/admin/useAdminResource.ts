"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, ApiError, errorMessage, redirectToLogin } from "../../lib/api";

/**
 * A readable message for a failed admin request. A 5xx with no message from the API usually
 * means the API is asleep or restarting (Render's free plan), not that something is broken.
 */
export function adminErrorMessage(err: unknown, fallback: string): string {
  if (
    err instanceof ApiError &&
    err.status >= 500 &&
    /^Request failed \(HTTP \d+\)$/.test(err.message)
  ) {
    return "The server didn't answer. It may be waking up; try again in a few seconds.";
  }
  return errorMessage(err, fallback);
}

export interface Resource<T> {
  data: T | undefined;
  error: string | null;
  /** True while a request is in flight (also during a refresh, when old data stays visible). */
  loading: boolean;
  reload: () => void;
}

/**
 * Loads one admin API endpoint. Each section of a page loads on its own, so one failing
 * request shows an error in that section only instead of blanking the whole page.
 * Pass `null` as the path to skip loading.
 */
export function useAdminResource<T, R = unknown>(
  path: string | null,
  select: (raw: R) => T
): Resource<T> {
  const selectRef = useRef(select);
  selectRef.current = select;

  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(path !== null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (path === null) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiFetch<R>(path)
      .then((raw) => {
        if (cancelled) return;
        setData(selectRef.current(raw));
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          redirectToLogin();
          return;
        }
        setError(adminErrorMessage(err, "This section could not be loaded."));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [path, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { data, error, loading, reload };
}

/** Runs an admin action and reports a readable error; sends the admin to sign-in on 401. */
export async function runAdminAction<T>(
  action: () => Promise<T>
): Promise<{ ok: true; value: T } | { ok: false; message: string }> {
  try {
    return { ok: true, value: await action() };
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      redirectToLogin();
    }
    return {
      ok: false,
      message: adminErrorMessage(err, "The action could not be completed."),
    };
  }
}
