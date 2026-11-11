"use client";

import { useEffect } from "react";

const WARMED_AT_KEY = "bytehub_api_warmed_at";
const WARM_FOR_MS = 10 * 60 * 1000;

/**
 * The API on Render's free plan sleeps after 15 idle minutes and takes ~30–50 s to wake.
 * Pinging it quietly as soon as someone opens the site wakes it while they are still reading,
 * so their first real click (sign in, apply, pay) doesn't sit waiting.
 */
export function ApiWarmup() {
  useEffect(() => {
    try {
      const last = Number(sessionStorage.getItem(WARMED_AT_KEY) || 0);
      if (Date.now() - last < WARM_FOR_MS) return;
      sessionStorage.setItem(WARMED_AT_KEY, String(Date.now()));
    } catch {
      // Storage blocked (private mode): warming up is still worth it.
    }

    // After the page itself has loaded, so it never competes with what the visitor sees.
    const timer = window.setTimeout(() => {
      void fetch("/api/health", { cache: "no-store", credentials: "same-origin" }).catch(
        () => undefined
      );
    }, 1200);
    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
