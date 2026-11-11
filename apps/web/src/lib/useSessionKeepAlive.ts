"use client";

import { useEffect } from "react";
import { refreshSession } from "./api";

/**
 * Keeps the 15-minute session alive while a signed-in area is open, and renews it as soon as
 * the tab comes back into view, so navigating between protected pages never hits a stale
 * cookie (the Next.js middleware checks the access-token cookie on every protected route).
 */
export function useSessionKeepAlive(): void {
  useEffect(() => {
    const renew = () => {
      const last = Number(localStorage.getItem("bytehub_refreshed_at") || 0);
      if (Date.now() - last > 10 * 60 * 1000) {
        void refreshSession();
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") renew();
    };

    renew();
    const timer = window.setInterval(renew, 60 * 1000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}
